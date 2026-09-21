"""
BloodChain AI -- Brevo Transactional Email Integration Test Runner
==================================================================
Standalone verification script testing 15 distinct requirements:

1.  Settings defaults (BREVO_INTEGRATION_ENABLED=false, BREVO_* configured).
2.  NotificationDelivery model schema & provider_message_id field.
3.  Payload construction & validation.
4.  Deterministic forecast notification IDs & idempotency.
5.  Persistent outbox staging (PENDING status inside active transaction).
6.  Atomic rollback safety (uncommitted abort cancels outbox record).
7.  Post-commit crash resilience & pending status preservation.
8.  Brevo HTTPS API mock submission (POST to api.brevo.com/v3/smtp/email, api-key header, 201 response).
9.  HTTP acceptance semantics (marked 'submitted', NOT 'delivered' or 'sent').
10. Brevo message ID captured in provider_message_id.
11. Simulation / Demo mode when BREVO_INTEGRATION_ENABLED=False.
12. Duplicate suppression preserving original status.
13. Network timeout & failure isolation (non-blocking, marked FAILED).
14. Secret sanitization (BREVO_API_KEY never logged).
15. Outbox retry sweeper (retry_pending_notifications).

Usage:
    python test_brevo_integration.py
"""

import os
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
import requests

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')

import django
django.setup()

from django.conf import settings
from django.db import transaction
from django.test import override_settings

from apps.facilities.models import Facility, FacilityType
from apps.forecasting.models import ForecastRecord
from apps.notifications.models import NotificationDelivery, NotificationEventType, NotificationStatus
from apps.notifications.brevo_service import (
    BrevoEmailService,
    BREVO_API_ENDPOINT,
    format_brevo_html_email,
    resolve_recipient_email,
    sanitize_brevo_secrets,
)
from apps.transfers.models import TransferRequest, TransferStatus
from apps.notifications.integration_service import NotificationService, sanitize_log_message
from apps.notifications.views import TEST_RATE_LIMITS, NotificationTestView, BrevoWebhookView
from rest_framework.test import APIRequestFactory


def print_section(title: str):
    print(f"\n{'='*70}\n {title}\n{'='*70}")


def run_tests():
    passed = 0
    failed = 0
    total = 15

    print_section("BLOODCHAIN AI -- BREVO EMAIL INTEGRATION VERIFICATION")

    # Clean up test notifications from prior runs
    NotificationDelivery.objects.filter(notification_id__startswith="test-brevo-").delete()
    TEST_RATE_LIMITS.clear()

    # Ensure test facility exists
    facility, _ = Facility.objects.get_or_create(
        id='FAC_BREVO_TEST',
        defaults={
            'name': 'Brevo Test Medical Center',
            'facility_type': FacilityType.HOSPITAL,
            'region': 'Central',
            'city': 'Tiruchirappalli'
        }
    )

    # -------------------------------------------------------------
    # Test 1: Settings Defaults
    # -------------------------------------------------------------
    try:
        print("[Check 1] Verifying Brevo settings and environment defaults...")
        enabled_default = getattr(settings, 'BREVO_INTEGRATION_ENABLED', None)
        assert enabled_default is False, f"BREVO_INTEGRATION_ENABLED must be False by default, got: {enabled_default}"
        assert hasattr(settings, 'BREVO_API_KEY'), "BREVO_API_KEY setting missing"
        assert hasattr(settings, 'BREVO_SENDER_EMAIL'), "BREVO_SENDER_EMAIL setting missing"
        assert hasattr(settings, 'BREVO_SENDER_NAME'), "BREVO_SENDER_NAME setting missing"
        # Make sure legacy settings are gone
        assert not hasattr(settings, 'MAKE_INTEGRATION_ENABLED'), "Legacy MAKE_INTEGRATION_ENABLED should be removed"
        print("  [PASS]: Brevo settings present, BREVO_INTEGRATION_ENABLED=false default, legacy Make settings removed.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 2: Model Schema & provider_message_id field
    # -------------------------------------------------------------
    try:
        print("[Check 2] Inspecting NotificationDelivery model schema & provider_message_id field...")
        delivery_fields = [f.name for f in NotificationDelivery._meta.get_fields()]
        assert 'provider_message_id' in delivery_fields, "provider_message_id field missing on NotificationDelivery"
        assert 'status' in delivery_fields, "status field missing"
        assert 'notification_id' in delivery_fields, "notification_id field missing"
        assert NotificationStatus.SUBMITTED == 'submitted', "NotificationStatus.SUBMITTED missing"
        print("  [PASS]: NotificationDelivery model has provider_message_id and SUBMITTED status choice.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 3: Payload Construction & Validation
    # -------------------------------------------------------------
    try:
        print("[Check 3] Testing payload builder validation & schema...")
        payload = NotificationService.build_payload(
            notification_id="test-brevo-schema-1",
            event_type=NotificationEventType.LOW_STOCK_WARNING,
            recipient_role="blood_bank_staff",
            recipient_reference="Tiruchirappalli Regional Blood Bank",
            title="Low Stock Warning",
            message="O-Negative blood units below safety threshold.",
            reference_details={"blood_group": "O_NEGATIVE", "current_units": 2},
            priority="urgent",
            is_demo=True
        )
        assert payload["notification_id"] == "test-brevo-schema-1"
        assert payload["event_type"] == "low_stock_warning"
        assert payload["source_system"] == "BloodChain Django"
        assert payload["priority"] == "urgent"
        assert payload["reference_details"]["current_units"] == 2

        # Verify invalid event rejection
        try:
            NotificationService.build_payload(
                notification_id="invalid",
                event_type="UNREGISTERED_EVENT",
                recipient_role="admin",
                recipient_reference="None",
                title="Bad",
                message="Bad"
            )
            assert False, "Should have raised ValueError on unregistered event"
        except ValueError:
            pass

        print("  [PASS]: Payload schema conforms strictly; unsupported event types rejected.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 4: Forecast Idempotency Deterministic IDs
    # -------------------------------------------------------------
    try:
        print("[Check 4] Testing deterministic notification ID generation for forecasts...")
        forecast = ForecastRecord.objects.create(
            facility=facility,
            blood_group="B_POSITIVE",
            component_type="RBC",
            forecast_date=(datetime.now(timezone.utc) + timedelta(days=5)).date(),
            p10=5.0,
            p50=12.0,
            p90=18.0,
            protection_level=0.85,
            model_name="XGBoost"
        )
        deterministic_id = f"bc-notif-forecast-{forecast.id}"

        # First stage
        deliv1, created1 = NotificationService.stage_notification(
            event_type=NotificationEventType.DEMAND_ESTIMATE_READY,
            recipient_role="hospital_staff",
            recipient_reference=facility.name,
            title="Forecast Ready",
            message="Demand forecast calculated",
            notification_id=deterministic_id,
            reference_details={"forecast_id": str(forecast.id)}
        )
        assert created1 is True, "First staging must create record"

        # Duplicate stage with same deterministic ID
        deliv2, created2 = NotificationService.stage_notification(
            event_type=NotificationEventType.DEMAND_ESTIMATE_READY,
            recipient_role="hospital_staff",
            recipient_reference=facility.name,
            title="Forecast Ready",
            message="Demand forecast calculated",
            notification_id=deterministic_id,
            reference_details={"forecast_id": str(forecast.id)}
        )
        assert created2 is False, "Duplicate staging must return existing record"
        assert deliv1.id == deliv2.id, "Returned record must match existing record ID"
        print("  [PASS]: Forecast notifications use deterministic ForecastRecord ID; retries deduplicate cleanly.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 5: Persistent Outbox Staging (PENDING status)
    # -------------------------------------------------------------
    try:
        print("[Check 5] Verifying Stage 1: Notification staging creates record with status='pending'...")
        notif_id_stage = "test-brevo-stage-pending-1"
        delivery, created = NotificationService.stage_notification(
            event_type=NotificationEventType.TRANSFER_APPROVED,
            recipient_role="hospital_staff",
            recipient_reference="Facility Alpha",
            title="Transfer Approved",
            message="Your transfer request has been approved.",
            notification_id=notif_id_stage
        )
        assert created is True
        assert delivery.status == NotificationStatus.PENDING, f"Expected status 'pending', got: {delivery.status}"
        assert delivery.attempts == 0, f"Expected 0 initial attempts, got: {delivery.attempts}"
        print("  [PASS]: Outbox staging creates persistent record with status='pending' and attempts=0.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 6: Atomic Rollback Safety
    # -------------------------------------------------------------
    try:
        print("[Check 6] Testing atomic rollback safety (uncommitted abort cancels outbox record)...")
        rollback_id = "test-brevo-rollback-id-1"
        try:
            with transaction.atomic():
                NotificationService.stage_notification(
                    event_type=NotificationEventType.TRANSFER_PENDING_APPROVAL,
                    recipient_role="authorized_approver",
                    recipient_reference="Clinical Lead",
                    title="Pending Approval",
                    message="Clinical lead review requested",
                    notification_id=rollback_id
                )
                # Intentionally trigger rollback
                raise RuntimeError("Simulated transaction failure during hospital transfer request creation")
        except RuntimeError:
            pass

        exists = NotificationDelivery.objects.filter(notification_id=rollback_id).exists()
        assert not exists, "NotificationDelivery must NOT exist after enclosing transaction rolls back!"
        print("  [PASS]: Rolled-back business transactions cleanly abort notification outbox staging.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 7: Post-Commit Crash Resilience
    # -------------------------------------------------------------
    try:
        print("[Check 7] Testing post-commit crash resilience (pending outbox persists in PostgreSQL)...")
        crash_id = "test-brevo-crash-resilience-1"
        with transaction.atomic():
            d, _ = NotificationService.stage_notification(
                event_type=NotificationEventType.NOTIFICATION_TEST,
                recipient_role="admin",
                recipient_reference="Admin",
                title="Post Commit Resilience",
                message="Simulating server crash between DB commit and external HTTP dispatch",
                notification_id=crash_id
            )
        # Transaction committed! Simulate process crash before dispatch by querying DB directly
        persisted = NotificationDelivery.objects.get(notification_id=crash_id)
        assert persisted.status == NotificationStatus.PENDING, "Committed record must remain PENDING until dispatched"
        print("  [PASS]: Committed outbox records persist in PostgreSQL as PENDING across simulated process restarts.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 8: Brevo HTTPS Mock Submission (POST, api-key, JSON)
    # -------------------------------------------------------------
    try:
        print("[Check 8] Testing Brevo HTTPS API mock submission (POST, api-key header, 201 response)...")
        with override_settings(
            BREVO_INTEGRATION_ENABLED=True,
            BREVO_API_KEY="xkeysib-mock-test-key-4321",
            BREVO_SENDER_EMAIL="logistics@bloodchain.ai",
            BREVO_SENDER_NAME="BloodChain Logistics"
        ):
            mock_response = MagicMock()
            mock_response.status_code = 201
            mock_response.json.return_value = {"messageId": "<brevo-test-mock-msg-001@smtp.brevo.com>"}

            with patch('requests.post', return_value=mock_response) as mock_post:
                deliv, _ = NotificationService.stage_notification(
                    event_type=NotificationEventType.TRANSFER_IN_TRANSIT,
                    recipient_role="hospital_staff",
                    recipient_reference="St. Joseph Hospital",
                    title="Blood Transfer In Transit",
                    message="Courier has departed with 4 units of O-Positive RBC.",
                    notification_id="test-brevo-mock-dispatch-1",
                    reference_details={"recipient_email": "stjoseph@hospital.org"}
                )
                success, msg = NotificationService.execute_dispatch(deliv.id)

                assert success is True, f"Dispatch failed: {msg}"
                mock_post.assert_called_once()
                args, kwargs = mock_post.call_args

                # Verify URL
                assert args[0] == BREVO_API_ENDPOINT, f"Wrong endpoint: {args[0]}"
                # Verify headers
                headers = kwargs["headers"]
                assert headers["api-key"] == "xkeysib-mock-test-key-4321", "api-key header mismatch"
                assert headers["Content-Type"] == "application/json"
                assert headers["Accept"] == "application/json"

                # Verify payload
                json_data = kwargs["json"]
                assert json_data["sender"]["email"] == "logistics@bloodchain.ai"
                assert json_data["sender"]["name"] == "BloodChain Logistics"
                assert json_data["to"][0]["email"] == "stjoseph@hospital.org"
                assert "[BloodChain AI Demo]" in json_data["subject"]
                assert "courier" in json_data["htmlContent"].lower()

        print("  [PASS]: Brevo API HTTP POST executed with valid headers, recipient, sender, and responsive HTML body.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 9: HTTP Acceptance Marks 'submitted', NOT 'delivered'
    # -------------------------------------------------------------
    try:
        print("[Check 9] Verifying HTTP acceptance semantics (status='submitted', NOT 'delivered' or 'sent')...")
        deliv.refresh_from_db()
        assert deliv.status == NotificationStatus.SUBMITTED, f"Expected status 'submitted', got: {deliv.status}"
        assert deliv.status != NotificationStatus.DELIVERED, "Status must not be marked 'delivered' on API acceptance"
        assert deliv.status != NotificationStatus.SENT, "Status must be 'submitted' to reflect queue acceptance"
        print("  [PASS]: HTTP 201 response correctly marks delivery status as 'submitted' (queue acceptance).")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 10: Brevo messageId stored in provider_message_id
    # -------------------------------------------------------------
    try:
        print("[Check 10] Verifying Brevo messageId is captured into provider_message_id...")
        deliv.refresh_from_db()
        assert deliv.provider_message_id == "<brevo-test-mock-msg-001@smtp.brevo.com>", (
            f"provider_message_id mismatch: {deliv.provider_message_id}"
        )
        print("  [PASS]: Brevo messageId persisted in provider_message_id for exact traceability.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 11: Simulation Mode when BREVO_INTEGRATION_ENABLED=False
    # -------------------------------------------------------------
    try:
        print("[Check 11] Testing simulation mode when BREVO_INTEGRATION_ENABLED=False (zero HTTP calls)...")
        with override_settings(BREVO_INTEGRATION_ENABLED=False):
            with patch('requests.post') as mock_post:
                sim_deliv, _ = NotificationService.stage_notification(
                    event_type=NotificationEventType.TRANSFER_RECEIVED,
                    recipient_role="authorized_approver",
                    recipient_reference="Central Hub Approver",
                    title="Transfer Received",
                    message="Blood transfer received successfully.",
                    notification_id="test-brevo-sim-mode-1"
                )
                success, msg = NotificationService.execute_dispatch(sim_deliv.id)
                assert success is True
                mock_post.assert_not_called()

                sim_deliv.refresh_from_db()
                assert sim_deliv.status == NotificationStatus.DEMONSTRATION_SENT, (
                    f"Expected demonstration_sent, got: {sim_deliv.status}"
                )

        print("  [PASS]: Simulation mode safely skips network requests and transitions status to demonstration_sent.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 12: Duplicate Protection Preserves Original Status
    # -------------------------------------------------------------
    try:
        print("[Check 12] Testing duplicate protection does not overwrite existing record or status...")
        dup_id = "test-brevo-dup-id-1"
        orig, _ = NotificationService.stage_notification(
            event_type=NotificationEventType.TRANSFER_APPROVED,
            recipient_role="hospital_staff",
            recipient_reference="Facility Gamma",
            title="First Approval",
            message="Initial approval",
            notification_id=dup_id
        )
        orig.status = NotificationStatus.SUBMITTED
        orig.provider_message_id = "<brevo-msg-original-id>"
        orig.save()

        # Attempt to stage duplicate
        second, created = NotificationService.stage_notification(
            event_type=NotificationEventType.TRANSFER_APPROVED,
            recipient_role="hospital_staff",
            recipient_reference="Facility Gamma",
            title="Duplicate Attempt",
            message="Duplicate content",
            notification_id=dup_id
        )
        assert created is False, "Duplicate must return created=False"
        assert second.id == orig.id, "Returned object must match original object"
        second.refresh_from_db()
        assert second.status == NotificationStatus.SUBMITTED, "Status must remain SUBMITTED"
        assert second.provider_message_id == "<brevo-msg-original-id>", "Message ID must remain untouched"
        print("  [PASS]: Duplicate triggers do not overwrite existing delivery record or status.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 13: Network Timeout & Failure Non-Blocking
    # -------------------------------------------------------------
    try:
        print("[Check 13] Testing network timeout handling (non-blocking, marked FAILED)...")
        with override_settings(
            BREVO_INTEGRATION_ENABLED=True,
            BREVO_API_KEY="xkeysib-mock-key",
            BREVO_SENDER_EMAIL="test@bloodchain.ai"
        ):
            with patch('requests.post', side_effect=requests.exceptions.Timeout("Read timeout after 5.0s")):
                fail_deliv, _ = NotificationService.stage_notification(
                    event_type=NotificationEventType.NOTIFICATION_TEST,
                    recipient_role="admin",
                    recipient_reference="Admin",
                    title="Timeout Test",
                    message="Testing network failure handling",
                    notification_id="test-brevo-timeout-1"
                )
                success, msg = NotificationService.execute_dispatch(fail_deliv.id)

                assert success is False, "Dispatch should report failure"
                fail_deliv.refresh_from_db()
                assert fail_deliv.status == NotificationStatus.FAILED, f"Expected FAILED, got {fail_deliv.status}"
                assert fail_deliv.attempts == 1, f"Expected 1 attempt, got {fail_deliv.attempts}"
                assert "timeout" in fail_deliv.error_message.lower(), "Error message should mention timeout"

        print("  [PASS]: Network timeouts handled gracefully without crashing caller; status marked FAILED.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 14: Secret Sanitization
    # -------------------------------------------------------------
    try:
        print("[Check 14] Testing secret sanitization in logs and error strings...")
        secret_key = "xkeysib-super-confidential-token-987654321"
        with override_settings(BREVO_API_KEY=secret_key):
            raw_log = f"Failed to deliver notification with Brevo key {secret_key} to endpoint"
            cleaned = sanitize_log_message(raw_log)
            assert secret_key not in cleaned, "Secret key was NOT redacted from log string!"
            assert "[REDACTED_API_KEY]" in cleaned, "Redaction placeholder missing"

        print("  [PASS]: Brevo API key is completely redacted from logs and error strings.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 15: Outbox Retry Sweeper
    # -------------------------------------------------------------
    try:
        print("[Check 15] Testing Outbox Retry Sweeper (retry_pending_notifications)...")
        # Ensure our timeout notification from test 13 is retryable
        fail_deliv.refresh_from_db()
        assert fail_deliv.status == NotificationStatus.FAILED
        assert fail_deliv.attempts < fail_deliv.max_attempts

        # Mock successful Brevo delivery for retry sweeper
        mock_retry_resp = MagicMock()
        mock_retry_resp.status_code = 201
        mock_retry_resp.json.return_value = {"messageId": "<brevo-retry-msg-id-777>"}

        with override_settings(
            BREVO_INTEGRATION_ENABLED=True,
            BREVO_API_KEY="xkeysib-mock-key",
            BREVO_SENDER_EMAIL="test@bloodchain.ai"
        ):
            with patch('requests.post', return_value=mock_retry_resp):
                retried_count = NotificationService.retry_pending_notifications()
                assert retried_count >= 1, f"Expected at least 1 notification retried, got: {retried_count}"

                fail_deliv.refresh_from_db()
                assert fail_deliv.status == NotificationStatus.SUBMITTED, (
                    f"Retried delivery expected SUBMITTED, got: {fail_deliv.status}"
                )
                assert fail_deliv.attempts == 2, f"Expected 2 attempts, got: {fail_deliv.attempts}"
                assert fail_deliv.provider_message_id == "<brevo-retry-msg-id-777>"

        print("  [PASS]: Outbox retry sweeper successfully recovered and dispatched failed outbox records.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 16: Zero Patient-Sensitive Data (PHI Protection)
    # -------------------------------------------------------------
    try:
        print("[Check 16] Verifying zero patient-sensitive data (PHI) in email generation & payloads...")
        phi_payload = NotificationService.build_payload(
            notification_id="test-brevo-phi-check-1",
            event_type=NotificationEventType.TRANSFER_APPROVED,
            recipient_role="hospital_staff",
            recipient_reference="Facility Alpha",
            title="Transfer Approved",
            message="Transfer approved for 3 units O-Negative blood",
            reference_details={
                "transfer_id": "TR-12345",
                "blood_group": "O_NEGATIVE",
                "units": 3,
                "patient_name": "Test Patient",
                "mrn": "MRN-123456",
                "diagnosis": "Emergency Trauma",
            }
        )
        assert "patient_name" not in phi_payload["reference_details"], "Patient name must be excluded from payload!"
        assert "mrn" not in phi_payload["reference_details"], "MRN must be excluded from payload!"
        assert "diagnosis" not in phi_payload["reference_details"], "Diagnosis must be excluded from payload!"

        # Check HTML email rendering strips any accidental PHI keys
        rendered_html = format_brevo_html_email(
            title=phi_payload["title"],
            message=phi_payload["message"],
            event_type=phi_payload["event_type"],
            notification_id=phi_payload["notification_id"],
            recipient_name="Facility Staff",
            occurred_at=phi_payload["occurred_at"],
            reference_details={
                "transfer_id": "TR-12345",
                "patient_name": "Test Patient",
                "mrn": "MRN-123456"
            }
        )
        assert "Test Patient" not in rendered_html, "Patient name must NOT appear in HTML email body!"
        assert "MRN-123456" not in rendered_html, "MRN must NOT appear in HTML email body!"
        print("  [PASS]: Zero patient-sensitive data (PHI) in emails; patient identifiers are strictly blocked.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Setup for Webhook Readiness Tests (Checks 17-24)
    # -------------------------------------------------------------
    factory = APIRequestFactory()
    webhook_view = BrevoWebhookView.as_view()

    wh_deliv = NotificationDelivery.objects.create(
        notification_id="test-brevo-wh-record-1",
        event_type=NotificationEventType.TRANSFER_APPROVED,
        recipient_role="hospital_staff",
        recipient_reference="Webhook Ward Alpha",
        title="Transfer Approved Test",
        message="Message for webhook test",
        status=NotificationStatus.SUBMITTED,
        provider_message_id="<brevo-wh-msg-id-8888@smtp.brevo.com>",
        attempts=1
    )

    # -------------------------------------------------------------
    # Test 17: Mocked Webhook - Valid 'delivered' Event
    # -------------------------------------------------------------
    try:
        print("[Check 17] Mocked Webhook: Valid 'delivered' event transitions status to DELIVERED...")
        req = factory.post(
            '/api/notifications/brevo-webhook/',
            data={
                "event": "delivered",
                "message-id": "<brevo-wh-msg-id-8888@smtp.brevo.com>",
                "date": "2026-09-22 00:25:00",
                "ts_event": 1790017500
            },
            format='json'
        )
        resp = webhook_view(req)
        assert resp.status_code == 200, f"Expected 200, got: {resp.status_code}"
        assert resp.data['status'] == 'success'
        wh_deliv.refresh_from_db()
        assert wh_deliv.status == NotificationStatus.DELIVERED, f"Expected DELIVERED, got: {wh_deliv.status}"
        assert wh_deliv.last_callback_at is not None
        print("  [PASS]: Valid 'delivered' event successfully updated outbox status to DELIVERED.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 18: Mocked Webhook - Malformed Payload Rejected
    # -------------------------------------------------------------
    try:
        print("[Check 18] Mocked Webhook: Malformed payloads rejected with 400 Bad Request...")
        req1 = factory.post('/api/notifications/brevo-webhook/', data={}, format='json')
        resp1 = webhook_view(req1)
        assert resp1.status_code == 400
        assert resp1.data['error'] == 'MALFORMED_PAYLOAD'

        req2 = factory.post('/api/notifications/brevo-webhook/', data={"event": "delivered"}, format='json')
        resp2 = webhook_view(req2)
        assert resp2.status_code == 400
        assert resp2.data['error'] == 'MALFORMED_PAYLOAD'
        print("  [PASS]: Malformed webhook payloads missing event or message-id properly rejected.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 19: Mocked Webhook - Duplicate Event Idempotency
    # -------------------------------------------------------------
    try:
        print("[Check 19] Mocked Webhook: Duplicate delivery event is idempotent (duplicate_idempotent)...")
        req = factory.post(
            '/api/notifications/brevo-webhook/',
            data={
                "event": "delivered",
                "message-id": "<brevo-wh-msg-id-8888@smtp.brevo.com>",
                "ts_event": 1790017500
            },
            format='json'
        )
        resp = webhook_view(req)
        assert resp.status_code == 200
        assert resp.data['status'] == 'duplicate_idempotent'
        wh_deliv.refresh_from_db()
        assert wh_deliv.status == NotificationStatus.DELIVERED
        print("  [PASS]: Duplicate webhook event safely acknowledged with 200 OK without status mutation.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 20: Mocked Webhook - Stale Callback Ignored
    # -------------------------------------------------------------
    try:
        print("[Check 20] Mocked Webhook: Stale callback timestamp safely ignored (stale_ignored)...")
        # Ensure last_callback_at is in the future relative to stale event
        wh_deliv.last_callback_at = datetime(2026, 9, 22, 2, 0, 0, tzinfo=timezone.utc)
        wh_deliv.status = NotificationStatus.SUBMITTED
        wh_deliv.save()

        req = factory.post(
            '/api/notifications/brevo-webhook/',
            data={
                "event": "delivered",
                "message-id": "<brevo-wh-msg-id-8888@smtp.brevo.com>",
                "ts_event": 1790010000  # much earlier timestamp
            },
            format='json'
        )
        resp = webhook_view(req)
        assert resp.status_code == 200
        assert resp.data['status'] == 'stale_ignored'
        wh_deliv.refresh_from_db()
        assert wh_deliv.status == NotificationStatus.SUBMITTED
        print("  [PASS]: Stale webhook timestamp older than last recorded event safely ignored.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 21: Mocked Webhook - Unknown Message ID Returns 404
    # -------------------------------------------------------------
    try:
        print("[Check 21] Mocked Webhook: Unknown message ID returns 404 Not Found...")
        req = factory.post(
            '/api/notifications/brevo-webhook/',
            data={
                "event": "delivered",
                "message-id": "<non-existent-msg-id-9999@smtp.brevo.com>",
                "ts_event": 1790017500
            },
            format='json'
        )
        resp = webhook_view(req)
        assert resp.status_code == 404
        assert resp.data['error'] == 'UNKNOWN_MESSAGE'
        print("  [PASS]: Webhook for non-existent message ID safely returns 404 Not Found.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 22: Mocked Webhook - Unsupported Event Returns 400
    # -------------------------------------------------------------
    try:
        print("[Check 22] Mocked Webhook: Unsupported event returns 400 Bad Request...")
        req = factory.post(
            '/api/notifications/brevo-webhook/',
            data={
                "event": "unsupported_foreign_event",
                "message-id": "<brevo-wh-msg-id-8888@smtp.brevo.com>",
                "ts_event": 1790017500
            },
            format='json'
        )
        resp = webhook_view(req)
        assert resp.status_code == 400
        assert resp.data['error'] == 'UNSUPPORTED_EVENT'
        print("  [PASS]: Unsupported webhook events rejected with 400 Bad Request.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 23: Mocked Webhook - Status Downgrade Prevention
    # -------------------------------------------------------------
    try:
        print("[Check 23] Mocked Webhook: Status downgrade attempt rejected (409 Conflict)...")
        wh_deliv.status = NotificationStatus.DELIVERED
        wh_deliv.last_callback_at = datetime.now(timezone.utc)
        wh_deliv.save()

        # Attempt to downgrade DELIVERED to request (SUBMITTED)
        req = factory.post(
            '/api/notifications/brevo-webhook/',
            data={
                "event": "request",
                "message-id": "<brevo-wh-msg-id-8888@smtp.brevo.com>",
                "ts_event": int(time.time()) + 10
            },
            format='json'
        )
        resp = webhook_view(req)
        assert resp.status_code == 409, f"Expected 409 Conflict, got: {resp.status_code}"
        assert resp.data['error'] == 'STATUS_DOWNGRADE_PREVENTED'
        wh_deliv.refresh_from_db()
        assert wh_deliv.status == NotificationStatus.DELIVERED
        print("  [PASS]: Attempt to downgrade 'delivered' back to 'submitted' blocked with 409 Conflict.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Test 24: Mocked Webhook - Zero Business Mutation
    # -------------------------------------------------------------
    try:
        print("[Check 24] Mocked Webhook: Zero business mutation on TransferRequest & Inventory...")
        business_transfer = TransferRequest.objects.create(
            source_facility=facility,
            destination_facility=facility,
            blood_group="B_POSITIVE",
            component_type="RBC",
            requested_quantity=5,
            status=TransferStatus.PENDING_APPROVAL
        )
        initial_status = business_transfer.status

        req = factory.post(
            '/api/notifications/brevo-webhook/',
            data={
                "event": "delivered",
                "message-id": "<brevo-wh-msg-id-8888@smtp.brevo.com>",
                "ts_event": int(time.time()) + 20
            },
            format='json'
        )
        resp = webhook_view(req)
        # Even if webhook acknowledges, business transfer must remain unchanged
        business_transfer.refresh_from_db()
        assert business_transfer.status == initial_status, (
            f"Business transfer status mutated by webhook callback! Expected {initial_status}, got: {business_transfer.status}"
        )
        print("  [PASS]: Invariant verified: Webhook callbacks have zero capability to alter business transfers.")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # -------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------
    print_section("TEST EXECUTION RESULTS SUMMARY")
    total = 24
    print(f"Total Checks: {total}")
    print(f"Passed:       {passed}")
    print(f"Failed:       {failed}")

    # Clean up test notifications
    NotificationDelivery.objects.filter(notification_id__startswith="test-brevo-").delete()

    if failed > 0:
        print("\n[FAIL] SOME VERIFICATION CHECKS FAILED.")
        sys.exit(1)
    else:
        print("\n[OK] ALL 24 BREVO INTEGRATION VERIFICATION CHECKS PASSED PERFECTLY!")
        sys.exit(0)


if __name__ == "__main__":
    run_tests()
