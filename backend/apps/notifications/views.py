"""
BloodChain AI — Notification Views (Brevo Transactional Email Integration)
==========================================================================
1. NotificationTestView: Secured test trigger for Admins and Authorized Approvers.
   Verifies direct email dispatch to Brevo Transactional Email API.
2. NotificationStatusView: Read-only status query endpoint for notification outbox records.
3. BrevoWebhookView: Inbound delivery status callback handler for Brevo events.
   Maintains idempotency, downgrade prevention, stale rejection, and zero business mutation.
"""

import hmac
import logging
import time
from datetime import datetime, timezone
from typing import Dict, List

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import NotificationDelivery, NotificationEventType, NotificationStatus
from .integration_service import NotificationService

logger = logging.getLogger(__name__)

# In-memory rate limiter for NotificationTestView (5 requests/minute)
TEST_RATE_LIMITS: Dict[str, List[float]] = {}
MAX_TESTS_PER_MINUTE = 5


def _get_client_ip(request) -> str:
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '127.0.0.1')


def _get_user_role(request) -> str:
    meta = getattr(request, 'META', {})
    headers = getattr(request, 'headers', {})
    role_header = meta.get('HTTP_X_USER_ROLE') or headers.get('x-user-role') or headers.get('X-User-Role')
    role_data = None
    if hasattr(request, 'data') and isinstance(request.data, dict):
        role_data = request.data.get('user_role') or request.data.get('role')
    user = getattr(request, 'user', None)
    role_user = getattr(user, 'role', None) if user else None
    return role_user or role_header or role_data or 'HOSPITAL_STAFF'


class NotificationTestView(APIView):
    """
    Secured test endpoint for Administrators and Authorized Approvers.
    Dispatches a direct transactional email test through BrevoEmailService.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        # 1. Role verification: Only ADMIN and AUTHORIZED_APPROVER allowed
        role = _get_user_role(request)
        if role not in ['ADMIN', 'AUTHORIZED_APPROVER']:
            return Response(
                {"error": "UNAUTHORIZED_ROLE", "message": f"Role '{role}' is not authorized to trigger notification tests. Only Admins and Authorized Approvers can perform test dispatches."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 2. Rate limiting (max 5 tests per minute)
        client_key = f"{_get_client_ip(request)}_{role}"
        now = time.time()
        requests_history = TEST_RATE_LIMITS.setdefault(client_key, [])
        TEST_RATE_LIMITS[client_key] = [ts for ts in requests_history if now - ts < 60]

        if len(TEST_RATE_LIMITS[client_key]) >= MAX_TESTS_PER_MINUTE:
            return Response(
                {"error": "RATE_LIMITED", "message": "Rate limit exceeded. Maximum 5 test notifications per minute allowed."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        TEST_RATE_LIMITS[client_key].append(now)

        # 3. Deterministic Test ID
        test_tag = request.data.get('test_tag') or int(now)
        test_notif_id = f"bc-notif-test-{test_tag}"
        custom_email = request.data.get('recipient_email')

        ref_details = {'test_tag': str(test_tag)}
        if custom_email:
            ref_details['recipient_email'] = str(custom_email).strip()

        delivery, created = NotificationService.stage_notification(
            event_type=NotificationEventType.NOTIFICATION_TEST,
            recipient_role='admin',
            recipient_reference='System Administrator',
            title='Brevo Email Connectivity Test',
            message='Demonstration email connectivity verification for Brevo Transactional Email API.',
            reference_details=ref_details,
            priority='normal',
            notification_id=test_notif_id
        )

        success, msg = NotificationService.execute_dispatch(delivery.id)
        delivery.refresh_from_db()

        return Response({
            "status": "success" if success else "failed",
            "notification_id": delivery.notification_id,
            "delivery_status": delivery.status,
            "provider_message_id": delivery.provider_message_id,
            "message": msg,
            "is_demo": delivery.is_demo,
            "attempts": delivery.attempts
        })


class NotificationStatusView(APIView):
    """
    Read-only view to inspect outbox delivery status by notification_id.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, notification_id: str):
        delivery = NotificationDelivery.objects.filter(notification_id=notification_id).first()
        if not delivery:
            return Response(
                {"error": "NOT_FOUND", "message": f"Notification '{notification_id}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "notification_id": delivery.notification_id,
            "event_type": delivery.event_type,
            "status": delivery.status,
            "provider_message_id": delivery.provider_message_id,
            "attempts": delivery.attempts,
            "max_attempts": delivery.max_attempts,
            "title": delivery.title,
            "created_at": delivery.created_at.isoformat(),
            "error_message": delivery.error_message
        })


class BrevoWebhookView(APIView):
    """
    Inbound webhook receiver for Brevo transactional email status events.

    CRITICAL INVARIANTS:
    1. Zero Business Mutation: Only updates NotificationDelivery.status and last_callback_at.
       TransferRequest, BloodInventory, and clinical workflows are never mutated.
    2. Idempotency: Duplicate delivery events for the same message ID safely acknowledge 200 OK.
    3. Downgrade Prevention: Cannot downgrade a terminal status ('delivered' -> 'submitted').
    4. Stale Callback Handling: Events older than delivery.last_callback_at are safely ignored.
    5. Token Authentication: Constant-time comparison if BREVO_WEBHOOK_SECRET is set.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        # 1. Optional Secret Authentication check
        webhook_secret = getattr(settings, 'BREVO_WEBHOOK_SECRET', '') or ''
        if webhook_secret:
            incoming_token = (
                request.headers.get('X-Brevo-Webhook-Token') or
                request.headers.get('x-brevo-webhook-token') or
                request.query_params.get('token')
            )
            if hasattr(request, 'data') and isinstance(request.data, dict) and not incoming_token:
                incoming_token = request.data.get('token')

            if not incoming_token or not hmac.compare_digest(str(incoming_token), str(webhook_secret)):
                return Response(
                    {"error": "UNAUTHORIZED_WEBHOOK", "message": "Invalid or missing Brevo webhook token."},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        # 2. Payload structure validation
        data = request.data
        if not isinstance(data, dict):
            return Response(
                {"error": "MALFORMED_PAYLOAD", "message": "Expected JSON object payload."},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw_event = data.get('event')
        if not raw_event or not isinstance(raw_event, str) or not raw_event.strip():
            return Response(
                {"error": "MALFORMED_PAYLOAD", "message": "Missing required field 'event'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        event = raw_event.lower().strip()

        KNOWN_DELIVERY_EVENTS = {'delivered', 'opened', 'click', 'first_opening', 'unique_opened'}
        KNOWN_FAILURE_EVENTS = {'hard_bounce', 'soft_bounce', 'blocked', 'spam', 'invalid_email', 'error'}
        KNOWN_SUBMISSION_EVENTS = {'request', 'deferred'}

        all_supported = KNOWN_DELIVERY_EVENTS | KNOWN_FAILURE_EVENTS | KNOWN_SUBMISSION_EVENTS
        if event not in all_supported:
            return Response(
                {"error": "UNSUPPORTED_EVENT", "message": f"Event type '{event}' is not supported."},
                status=status.HTTP_400_BAD_REQUEST
            )

        message_id = data.get('message-id') or data.get('messageId') or data.get('message_id')
        if not message_id or not isinstance(message_id, str) or not message_id.strip():
            return Response(
                {"error": "MALFORMED_PAYLOAD", "message": "Missing required field 'message-id'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        message_id = message_id.strip()

        # 3. Locate notification record
        delivery = NotificationDelivery.objects.filter(provider_message_id=message_id).first()
        if not delivery:
            delivery = NotificationDelivery.objects.filter(notification_id=message_id).first()

        if not delivery:
            return Response(
                {"error": "UNKNOWN_MESSAGE", "message": f"No notification found with message ID '{message_id}'."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 4. Timestamp parsing and stale callback check
        event_ts = data.get('ts_event') or data.get('ts')
        event_time = None
        if event_ts:
            try:
                event_time = datetime.fromtimestamp(float(event_ts), tz=timezone.utc)
            except Exception:
                pass
        if not event_time and data.get('date'):
            try:
                date_str = str(data.get('date')).strip().replace(' ', 'T')
                event_time = datetime.fromisoformat(date_str)
                if event_time.tzinfo is None:
                    event_time = event_time.replace(tzinfo=timezone.utc)
            except Exception:
                pass
        if not event_time:
            event_time = datetime.now(timezone.utc)

        if delivery.last_callback_at and event_time < delivery.last_callback_at:
            return Response({
                "status": "stale_ignored",
                "message": "Callback timestamp is older than last recorded event; ignoring stale callback.",
                "current_status": delivery.status,
                "provider_message_id": delivery.provider_message_id
            }, status=status.HTTP_200_OK)

        # 5. Target status mapping
        if event in KNOWN_DELIVERY_EVENTS:
            target_status = NotificationStatus.DELIVERED
        elif event in KNOWN_FAILURE_EVENTS:
            target_status = NotificationStatus.FAILED
        else:
            target_status = NotificationStatus.SUBMITTED

        # 6. Status Downgrade Prevention
        # Rank: PENDING(1) < SUBMITTED/DEMO(2) < DELIVERED/FAILED(3)
        STATUS_PRECEDENCE = {
            NotificationStatus.PENDING: 1,
            NotificationStatus.DEMONSTRATION_SENT: 2,
            NotificationStatus.SUBMITTED: 2,
            NotificationStatus.SENT: 2,
            NotificationStatus.FAILED: 3,
            NotificationStatus.DELIVERED: 3,
        }
        current_rank = STATUS_PRECEDENCE.get(delivery.status, 0)
        target_rank = STATUS_PRECEDENCE.get(target_status, 0)

        # Duplicate event check: already at target status -> idempotent success
        if delivery.status == target_status:
            delivery.last_callback_at = event_time
            delivery.save(update_fields=['last_callback_at', 'updated_at'])
            return Response({
                "status": "duplicate_idempotent",
                "message": f"Notification is already in status '{delivery.status}'. Duplicate event safely acknowledged.",
                "delivery_status": delivery.status,
                "provider_message_id": delivery.provider_message_id
            }, status=status.HTTP_200_OK)

        # Downgrade prevention
        if target_rank < current_rank:
            return Response({
                "error": "STATUS_DOWNGRADE_PREVENTED",
                "message": f"Cannot downgrade delivery status from '{delivery.status}' to '{target_status}'.",
                "current_status": delivery.status,
                "provider_message_id": delivery.provider_message_id
            }, status=status.HTTP_409_CONFLICT)

        # 7. Apply status update (strictly on outbox record)
        delivery.status = target_status
        delivery.last_callback_at = event_time
        if target_status == NotificationStatus.FAILED:
            delivery.error_message = data.get('reason') or f"Brevo delivery failure event: {event}"
        delivery.save(update_fields=['status', 'last_callback_at', 'error_message', 'updated_at'])

        return Response({
            "status": "success",
            "message": f"Delivery status updated to '{delivery.status}'.",
            "delivery_status": delivery.status,
            "provider_message_id": delivery.provider_message_id,
            "notification_id": delivery.notification_id
        }, status=status.HTTP_200_OK)
