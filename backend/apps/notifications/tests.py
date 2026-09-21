"""
BloodChain AI — Notifications & Brevo Integration Unit Tests
============================================================
Comprehensive test suite verifying:
1. Two-stage persistent outbox (staging inside transaction, dispatch via on_commit).
2. Deterministic notification IDs & idempotency across retries.
3. Duplicate suppression preserving original records and status.
4. Direct Brevo Transactional Email HTTPS API dispatch (mocked).
5. Brevo API key header transmission and payload structure.
6. HTTP acceptance treated strictly as 'submitted', not 'delivered'.
7. Storage of Brevo messageId in provider_message_id.
8. Secret sanitization preventing API keys from leaking in logs or error messages.
9. Non-blocking error handling on network timeouts or HTTP errors.
10. Atomic rollback safety: uncommitted transactions do not dispatch notifications.
11. Role authorization and rate limiting on NotificationTestView.
"""

import json
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
import requests

from django.test import TestCase, override_settings
from django.db import transaction
from django.urls import reverse
from rest_framework.test import APIClient

from apps.facilities.models import Facility, FacilityType
from apps.forecasting.models import ForecastRecord
from apps.transfers.models import TransferRequest, TransferStatus
from apps.notifications.models import NotificationDelivery, NotificationEventType, NotificationStatus
from apps.notifications.brevo_service import (
    BrevoEmailService,
    format_brevo_html_email,
    resolve_recipient_email,
    sanitize_brevo_secrets,
)
from apps.notifications.integration_service import NotificationService, sanitize_log_message
from apps.notifications.views import TEST_RATE_LIMITS


class NotificationServiceTests(TestCase):
    def setUp(self):
        TEST_RATE_LIMITS.clear()
        self.facility = Facility.objects.create(
            id='FAC_TEST_A',
            name='Test Hospital Alpha',
            facility_type=FacilityType.HOSPITAL,
            region='Central',
            city='Tiruchirappalli'
        )

    def test_valid_payload_creation_and_schema(self):
        """Verifies payload structure strictly conforms to the required schema for all event types."""
        events = [
            NotificationEventType.TRANSFER_PENDING_APPROVAL,
            NotificationEventType.TRANSFER_APPROVED,
            NotificationEventType.TRANSFER_IN_TRANSIT,
            NotificationEventType.TRANSFER_RECEIVED,
            NotificationEventType.LOW_STOCK_WARNING,
            NotificationEventType.DEMAND_ESTIMATE_READY,
            NotificationEventType.NOTIFICATION_TEST,
        ]
        for event in events:
            payload = NotificationService.build_payload(
                notification_id=f"test-id-{event}",
                event_type=event,
                recipient_role="hospital_staff",
                recipient_reference="Test Unit",
                title="Test Title",
                message="Test Message",
                reference_details={"sample": "data"},
                priority="urgent",
                is_demo=True
            )
            self.assertEqual(payload["notification_id"], f"test-id-{event}")
            self.assertEqual(payload["event_type"], event)
            self.assertEqual(payload["source_system"], "BloodChain Django")
            self.assertEqual(payload["environment"], "demo")
            self.assertTrue(payload["occurred_at"].endswith("+00:00") or "Z" in payload["occurred_at"])
            self.assertEqual(payload["recipient_role"], "hospital_staff")
            self.assertEqual(payload["title"], "Test Title")
            self.assertEqual(payload["message"], "Test Message")
            self.assertEqual(payload["priority"], "urgent")
            self.assertTrue(payload["is_demo"])
            self.assertEqual(payload["reference_details"], {"sample": "data"})

    def test_invalid_event_rejection(self):
        """Verifies unsupported event types are rejected with ValueError."""
        with self.assertRaises(ValueError):
            NotificationService.build_payload(
                notification_id="test-invalid",
                event_type="UNSUPPORTED_RANDOM_EVENT",
                recipient_role="admin",
                recipient_reference="",
                title="Bad",
                message="Bad"
            )

    def test_forecast_idempotency_deterministic_id(self):
        """Verifies repeated dispatches for the same ForecastRecord generate the exact same deterministic ID."""
        forecast = ForecastRecord.objects.create(
            facility=self.facility,
            blood_group="O_POSITIVE",
            component_type="RBC",
            forecast_date=(datetime.now(timezone.utc) + timedelta(days=7)).date(),
            p10=8.0,
            p50=10.0,
            p90=14.0,
            protection_level=0.85,
            model_name="XGBoost"
        )
        deterministic_id = f"bc-notif-forecast-{forecast.id}"

        # First stage
        delivery1, created1 = NotificationService.stage_notification(
            event_type=NotificationEventType.DEMAND_ESTIMATE_READY,
            recipient_role="hospital_staff",
            recipient_reference=self.facility.name,
            title="Demand estimate ready",
            message="Forecast is ready",
            notification_id=deterministic_id,
            reference_details={"forecast_record_id": str(forecast.id)}
        )
        self.assertTrue(created1)
        self.assertEqual(delivery1.notification_id, deterministic_id)

        # Second stage with same deterministic ID (simulate retry)
        delivery2, created2 = NotificationService.stage_notification(
            event_type=NotificationEventType.DEMAND_ESTIMATE_READY,
            recipient_role="hospital_staff",
            recipient_reference=self.facility.name,
            title="Demand estimate ready",
            message="Forecast is ready",
            notification_id=deterministic_id,
            reference_details={"forecast_record_id": str(forecast.id)}
        )
        self.assertFalse(created2)
        self.assertEqual(delivery1.id, delivery2.id)
        self.assertEqual(NotificationDelivery.objects.filter(notification_id=deterministic_id).count(), 1)

    def test_duplicate_preservation_does_not_overwrite_status(self):
        """Verifies that duplicate triggers do NOT falsely overwrite existing delivery status."""
        deterministic_id = "bc-notif-transfer-999"
        delivery, _ = NotificationService.stage_notification(
            event_type=NotificationEventType.TRANSFER_APPROVED,
            recipient_role="hospital_staff",
            recipient_reference="Facility Alpha",
            title="Transfer approved",
            message="Transfer approved",
            notification_id=deterministic_id
        )
        # Mark as submitted
        delivery.status = NotificationStatus.SUBMITTED
        delivery.provider_message_id = "<brevo-test-id-123>"
        delivery.save()

        # Duplicate stage attempt
        existing, created = NotificationService.stage_notification(
            event_type=NotificationEventType.TRANSFER_APPROVED,
            recipient_role="hospital_staff",
            recipient_reference="Facility Alpha",
            title="Transfer approved",
            message="Transfer approved",
            notification_id=deterministic_id
        )
        self.assertFalse(created)
        existing.refresh_from_db()
        self.assertEqual(existing.status, NotificationStatus.SUBMITTED)
        self.assertEqual(existing.provider_message_id, "<brevo-test-id-123>")

    @override_settings(
        BREVO_INTEGRATION_ENABLED=True,
        BREVO_API_KEY="xkeysib-mock-test-key-99999",
        BREVO_SENDER_EMAIL="notifications@bloodchain.ai",
        BREVO_SENDER_NAME="BloodChain AI Emergency"
    )
    @patch('requests.post')
    def test_brevo_api_key_header_and_submission(self, mock_post):
        """
        Verifies Brevo API integration:
        1. POST to https://api.brevo.com/v3/smtp/email
        2. api-key header is correctly transmitted.
        3. Response messageId is captured into provider_message_id.
        4. HTTP 201 acceptance marks status strictly as SUBMITTED (not delivered or sent).
        """
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"messageId": "<brevo-server-msg-123456@smtp-relay.mailin.fr>"}
        mock_post.return_value = mock_response

        delivery, _ = NotificationService.stage_notification(
            event_type=NotificationEventType.NOTIFICATION_TEST,
            recipient_role="admin",
            recipient_reference="Hospital Admin",
            title="Brevo Connectivity Test",
            message="Testing transactional email delivery via Brevo.",
            notification_id="test-brevo-header-dispatch-1",
            reference_details={"recipient_email": "admin@hospital.org"}
        )
        success, msg = NotificationService.execute_dispatch(delivery.id)

        self.assertTrue(success)
        mock_post.assert_called_once()
        call_args, call_kwargs = mock_post.call_args

        self.assertEqual(call_args[0], "https://api.brevo.com/v3/smtp/email")
        headers = call_kwargs["headers"]
        self.assertEqual(headers["api-key"], "xkeysib-mock-test-key-99999")
        self.assertEqual(headers["Content-Type"], "application/json")
        self.assertEqual(headers["Accept"], "application/json")

        json_payload = call_kwargs["json"]
        self.assertEqual(json_payload["sender"]["email"], "notifications@bloodchain.ai")
        self.assertEqual(json_payload["to"][0]["email"], "admin@hospital.org")
        self.assertIn("Brevo Connectivity Test", json_payload["subject"])

        delivery.refresh_from_db()
        # Requirement: Treat HTTP acceptance as submitted, not delivered
        self.assertEqual(delivery.status, NotificationStatus.SUBMITTED)
        self.assertEqual(delivery.provider_message_id, "<brevo-server-msg-123456@smtp-relay.mailin.fr>")
        self.assertIsNone(delivery.error_message)

    @override_settings(BREVO_INTEGRATION_ENABLED=False)
    @patch('requests.post')
    def test_simulation_mode_when_brevo_disabled(self, mock_post):
        """Verifies local demonstration simulation when BREVO_INTEGRATION_ENABLED is False (no HTTP call)."""
        delivery, _ = NotificationService.stage_notification(
            event_type=NotificationEventType.LOW_STOCK_WARNING,
            recipient_role="blood_bank_staff",
            recipient_reference="Regional Hub",
            title="Simulated Low Stock",
            message="Demo stock alert.",
            notification_id="test-sim-dispatch-1"
        )
        success, msg = NotificationService.execute_dispatch(delivery.id)

        self.assertTrue(success)
        mock_post.assert_not_called()

        delivery.refresh_from_db()
        self.assertEqual(delivery.status, NotificationStatus.DEMONSTRATION_SENT)

    @override_settings(
        BREVO_INTEGRATION_ENABLED=True,
        BREVO_API_KEY="xkeysib-mock-test-key-99999",
        BREVO_SENDER_EMAIL="notifications@bloodchain.ai"
    )
    @patch('requests.post', side_effect=requests.exceptions.Timeout("Connection timed out after 5.0s"))
    def test_timeout_and_failure_non_blocking(self, mock_post):
        """Verifies that Brevo network timeouts do not raise unhandled exceptions and mark status FAILED safely."""
        delivery, _ = NotificationService.stage_notification(
            event_type=NotificationEventType.NOTIFICATION_TEST,
            recipient_role="admin",
            recipient_reference="Admin",
            title="Test Timeout",
            message="Timeout check",
            notification_id="test-timeout-brevo-1"
        )
        success, msg = NotificationService.execute_dispatch(delivery.id)

        self.assertFalse(success)
        delivery.refresh_from_db()
        self.assertEqual(delivery.status, NotificationStatus.FAILED)
        self.assertEqual(delivery.attempts, 1)
        self.assertIn("timed out", delivery.error_message)

    @override_settings(
        BREVO_INTEGRATION_ENABLED=True,
        BREVO_API_KEY="xkeysib-bad-key",
        BREVO_SENDER_EMAIL="notifications@bloodchain.ai"
    )
    @patch('requests.post')
    def test_brevo_http_401_error_handling(self, mock_post):
        """Verifies HTTP 401 unauthorized response from Brevo marks delivery as FAILED gracefully."""
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = '{"code":"unauthorized","message":"Key not found"}'
        mock_post.return_value = mock_resp

        delivery, _ = NotificationService.stage_notification(
            event_type=NotificationEventType.NOTIFICATION_TEST,
            recipient_role="admin",
            recipient_reference="Admin",
            title="Unauthorized Test",
            message="Should fail with 401",
            notification_id="test-brevo-401-1"
        )
        success, msg = NotificationService.execute_dispatch(delivery.id)

        self.assertFalse(success)
        delivery.refresh_from_db()
        self.assertEqual(delivery.status, NotificationStatus.FAILED)
        self.assertIn("401", delivery.error_message)

    def test_secret_redaction(self):
        """Verifies Brevo API keys and Django secrets are redacted from log and error messages."""
        with override_settings(BREVO_API_KEY="xkeysib-super-secret-brevo-api-key-999"):
            raw_msg = "Error contacting Brevo with key xkeysib-super-secret-brevo-api-key-999 at endpoint"
            sanitized = sanitize_log_message(raw_msg)
            self.assertNotIn("xkeysib-super-secret-brevo-api-key-999", sanitized)
            self.assertIn("[REDACTED_API_KEY]", sanitized)

    def test_transaction_rollback_cancels_outbox_staging(self):
        """Verifies that an uncommitted transaction rolling back prevents the NotificationDelivery from persisting."""
        try:
            with transaction.atomic():
                NotificationService.stage_notification(
                    event_type=NotificationEventType.TRANSFER_APPROVED,
                    recipient_role="hospital_staff",
                    recipient_reference="Facility Beta",
                    title="Will Rollback",
                    message="This should never persist",
                    notification_id="test-rollback-notif-1"
                )
                # Force rollback
                raise RuntimeError("Simulated database failure during transfer approval")
        except RuntimeError:
            pass

        # Delivery must NOT exist in the database
        exists = NotificationDelivery.objects.filter(notification_id="test-rollback-notif-1").exists()
        self.assertFalse(exists, "NotificationDelivery must be cancelled if enclosing business transaction rolls back!")

    def test_html_email_escaping(self):
        """Verifies HTML body escaping protects against XSS in email bodies."""
        html_out = format_brevo_html_email(
            title="<script>alert('xss')</script> Urgent",
            message="Transfer <b>O-Positive</b> & blood units",
            event_type="transfer_approved",
            notification_id="test-notif-xss-1",
            recipient_name="Dr. Smith <Surgeon>",
            occurred_at="2026-09-21T23:00:00Z",
            reference_details={"facility": "General Hospital <Main>"}
        )
        self.assertNotIn("<script>", html_out)
        self.assertIn("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;", html_out)
        self.assertIn("Dr. Smith &lt;Surgeon&gt;", html_out)


class NotificationViewTests(TestCase):
    def setUp(self):
        TEST_RATE_LIMITS.clear()
        self.client = APIClient()

    def test_notification_test_view_role_authorization(self):
        """Verifies only ADMIN and AUTHORIZED_APPROVER roles can trigger NotificationTestView."""
        url = reverse('notifications:notification_test')

        # 1. Unauthorized role (hospital_staff)
        resp = self.client.post(url, data={'user_role': 'HOSPITAL_STAFF'})
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.data['error'], 'UNAUTHORIZED_ROLE')

        # 2. Authorized role (ADMIN)
        resp = self.client.post(url, data={'user_role': 'ADMIN', 'test_tag': 'unit-test-role-check'})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'success')

        # 3. Authorized role (AUTHORIZED_APPROVER)
        resp = self.client.post(url, data={'user_role': 'AUTHORIZED_APPROVER', 'test_tag': 'unit-test-approver-check'})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'success')

    def test_notification_test_view_rate_limit(self):
        """Verifies rate limiting blocks more than 5 test requests per minute."""
        url = reverse('notifications:notification_test')
        for i in range(5):
            resp = self.client.post(url, data={'user_role': 'ADMIN', 'test_tag': f'rate-limit-{i}'})
            self.assertEqual(resp.status_code, 200)

        # 6th request must be rejected with 429
        resp = self.client.post(url, data={'user_role': 'ADMIN', 'test_tag': 'rate-limit-6'})
        self.assertEqual(resp.status_code, 429)
        self.assertEqual(resp.data['error'], 'RATE_LIMITED')

    def test_notification_status_view(self):
        """Verifies read-only status endpoint returns correct outbox details."""
        delivery, _ = NotificationService.stage_notification(
            event_type=NotificationEventType.NOTIFICATION_TEST,
            recipient_role="admin",
            recipient_reference="System Administrator",
            title="Status Inspection Test",
            message="Status Inspection",
            notification_id="test-status-view-1"
        )
        delivery.status = NotificationStatus.SUBMITTED
        delivery.provider_message_id = "<brevo-msg-abc-999>"
        delivery.save()

        url = reverse('notifications:notification_status', kwargs={'notification_id': delivery.notification_id})
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['notification_id'], "test-status-view-1")
        self.assertEqual(resp.data['status'], "submitted")
        self.assertEqual(resp.data['provider_message_id'], "<brevo-msg-abc-999>")

    def test_patient_sensitive_data_phi_filtering(self):
        """Verifies that patient-sensitive data (PHI) like patient_name, mrn, diagnosis are strictly filtered out."""
        payload = NotificationService.build_payload(
            notification_id="test-phi-filter-1",
            event_type=NotificationEventType.TRANSFER_APPROVED,
            recipient_role="hospital_staff",
            recipient_reference="Ward A",
            title="Blood Transfer Approved",
            message="Transfer approved for 2 units O+ RBC",
            reference_details={
                "transfer_reference": "TR-100",
                "patient_name": "John Doe",
                "mrn": "MRN-998822",
                "diagnosis": "Severe Anemia",
                "blood_group": "O_POSITIVE",
                "units": 2
            }
        )
        ref_details = payload["reference_details"]
        self.assertNotIn("patient_name", ref_details)
        self.assertNotIn("mrn", ref_details)
        self.assertNotIn("diagnosis", ref_details)
        self.assertEqual(ref_details["transfer_reference"], "TR-100")
        self.assertEqual(ref_details["units"], 2)

        # Also verify HTML rendering strips PHI
        html_body = format_brevo_html_email(
            title=payload["title"],
            message=payload["message"],
            event_type=payload["event_type"],
            notification_id=payload["notification_id"],
            recipient_name="Ward A",
            occurred_at=payload["occurred_at"],
            reference_details={
                "transfer_reference": "TR-100",
                "patient_name": "John Doe",
                "mrn": "MRN-998822"
            }
        )
        self.assertNotIn("John Doe", html_body)
        self.assertNotIn("MRN-998822", html_body)
        self.assertIn("TR-100", html_body)


class BrevoWebhookTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.webhook_url = reverse('notifications:brevo_webhook')
        self.facility = Facility.objects.create(
            id='FAC_WH_TEST',
            name='Webhook Test Hospital',
            facility_type=FacilityType.HOSPITAL,
            region='Central',
            city='Tiruchirappalli'
        )
        self.delivery = NotificationDelivery.objects.create(
            notification_id="test-wh-notif-1",
            event_type=NotificationEventType.TRANSFER_APPROVED,
            recipient_role="hospital_staff",
            recipient_reference="Webhook Ward",
            title="Transfer Approved",
            message="Transfer approved for test",
            status=NotificationStatus.SUBMITTED,
            provider_message_id="<brevo-wh-msg-12345@smtp.brevo.com>",
            attempts=1
        )

    def test_valid_delivered_event(self):
        resp = self.client.post(self.webhook_url, data={
            "event": "delivered",
            "message-id": "<brevo-wh-msg-12345@smtp.brevo.com>",
            "date": "2026-09-22 00:20:00",
            "ts_event": 1790017200
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'success')
        self.delivery.refresh_from_db()
        self.assertEqual(self.delivery.status, NotificationStatus.DELIVERED)
        self.assertIsNotNone(self.delivery.last_callback_at)

    def test_malformed_payload_rejected(self):
        resp = self.client.post(self.webhook_url, data={}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data['error'], 'MALFORMED_PAYLOAD')

        # Missing message-id
        resp = self.client.post(self.webhook_url, data={"event": "delivered"}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_duplicate_webhook_is_idempotent(self):
        # First delivery
        self.client.post(self.webhook_url, data={
            "event": "delivered",
            "message-id": "<brevo-wh-msg-12345@smtp.brevo.com>",
            "ts_event": 1790017200
        }, format='json')
        self.delivery.refresh_from_db()
        self.assertEqual(self.delivery.status, NotificationStatus.DELIVERED)

        # Duplicate event
        resp = self.client.post(self.webhook_url, data={
            "event": "delivered",
            "message-id": "<brevo-wh-msg-12345@smtp.brevo.com>",
            "ts_event": 1790017200
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'duplicate_idempotent')
        self.delivery.refresh_from_db()
        self.assertEqual(self.delivery.status, NotificationStatus.DELIVERED)

    def test_stale_callback_ignored(self):
        # Set last_callback_at
        self.delivery.last_callback_at = datetime(2026, 9, 22, 1, 0, 0, tzinfo=timezone.utc)
        self.delivery.save()

        # Send event with earlier timestamp
        resp = self.client.post(self.webhook_url, data={
            "event": "delivered",
            "message-id": "<brevo-wh-msg-12345@smtp.brevo.com>",
            "ts_event": 1790010000  # earlier than 1:00
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'stale_ignored')
        self.delivery.refresh_from_db()
        self.assertEqual(self.delivery.status, NotificationStatus.SUBMITTED)

    def test_unknown_message_id_returns_404(self):
        resp = self.client.post(self.webhook_url, data={
            "event": "delivered",
            "message-id": "<unknown-msg-999@smtp.brevo.com>",
            "ts_event": 1790017200
        }, format='json')
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.data['error'], 'UNKNOWN_MESSAGE')

    def test_unsupported_event_returns_400(self):
        resp = self.client.post(self.webhook_url, data={
            "event": "unsupported_random_event",
            "message-id": "<brevo-wh-msg-12345@smtp.brevo.com>",
            "ts_event": 1790017200
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data['error'], 'UNSUPPORTED_EVENT')

    def test_status_downgrade_prevention(self):
        # Set status to DELIVERED
        self.delivery.status = NotificationStatus.DELIVERED
        self.delivery.save()

        # Attempt to downgrade to 'request' (submitted)
        resp = self.client.post(self.webhook_url, data={
            "event": "request",
            "message-id": "<brevo-wh-msg-12345@smtp.brevo.com>",
            "ts_event": 1790017300
        }, format='json')
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(resp.data['error'], 'STATUS_DOWNGRADE_PREVENTED')
        self.delivery.refresh_from_db()
        self.assertEqual(self.delivery.status, NotificationStatus.DELIVERED)

    def test_zero_business_mutation_from_webhook(self):
        transfer = TransferRequest.objects.create(
            source_facility=self.facility,
            destination_facility=self.facility,
            blood_group="O_POSITIVE",
            component_type="RBC",
            requested_quantity=4,
            status=TransferStatus.PENDING_APPROVAL
        )
        initial_transfer_status = transfer.status

        self.client.post(self.webhook_url, data={
            "event": "delivered",
            "message-id": "<brevo-wh-msg-12345@smtp.brevo.com>",
            "ts_event": 1790017200
        }, format='json')

        transfer.refresh_from_db()
        self.assertEqual(transfer.status, initial_transfer_status, "Webhook must never alter TransferRequest business state!")

    def test_webhook_token_authentication(self):
        with override_settings(BREVO_WEBHOOK_SECRET="super-secret-token-123"):
            # Missing token -> 401
            resp = self.client.post(self.webhook_url, data={
                "event": "delivered",
                "message-id": "<brevo-wh-msg-12345@smtp.brevo.com>"
            }, format='json')
            self.assertEqual(resp.status_code, 401)

            # Invalid token -> 401
            resp = self.client.post(
                self.webhook_url,
                data={"event": "delivered", "message-id": "<brevo-wh-msg-12345@smtp.brevo.com>"},
                format='json',
                HTTP_X_BREVO_WEBHOOK_TOKEN="wrong-token"
            )
            self.assertEqual(resp.status_code, 401)

            # Valid token -> 200
            resp = self.client.post(
                self.webhook_url,
                data={"event": "delivered", "message-id": "<brevo-wh-msg-12345@smtp.brevo.com>"},
                format='json',
                HTTP_X_BREVO_WEBHOOK_TOKEN="super-secret-token-123"
            )
            self.assertEqual(resp.status_code, 200)
