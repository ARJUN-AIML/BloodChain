"""
BloodChain AI — Notification Outbox & Brevo Integration Service
===============================================================
Implements the Two-Stage Persistent Outbox pattern:
1. Stage notification inside the active business transaction (creates NotificationDelivery as PENDING).
2. Register external dispatch with transaction.on_commit().

Dispatches transactional emails via Brevo HTTPS API.
Django remains the sole authoritative system for clinical workflows.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from django.conf import settings
from django.db import transaction
from .models import NotificationDelivery, NotificationEventType, NotificationStatus
from .brevo_service import BrevoEmailService, sanitize_brevo_secrets

logger = logging.getLogger(__name__)


def sanitize_log_message(msg: str) -> str:
    """Removes sensitive keys, passwords, and tokens from log strings."""
    return sanitize_brevo_secrets(msg)


class NotificationService:
    """
    Manages deterministic payload creation, outbox staging, and safe external dispatch to Brevo.
    """

    @staticmethod
    def build_payload(
        notification_id: str,
        event_type: str,
        recipient_role: str,
        recipient_reference: str,
        title: str,
        message: str,
        reference_details: Optional[Dict[str, Any]] = None,
        priority: str = 'normal',
        is_demo: bool = True
    ) -> Dict[str, Any]:
        """Constructs and validates the safe notification payload schema."""
        valid_events = {choice[0] for choice in NotificationEventType.choices}
        if event_type not in valid_events:
            raise ValueError(f"Invalid event_type '{event_type}'. Must be one of: {sorted(valid_events)}")

        if not notification_id or not notification_id.strip():
            raise ValueError("notification_id must be a non-empty string.")

        if not title or not message:
            raise ValueError("title and message are required fields.")

        return {
            "notification_id": notification_id.strip(),
            "event_type": event_type,
            "source_system": "BloodChain Django",
            "environment": "demo",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "recipient_role": recipient_role or 'hospital_staff',
            "recipient_reference": recipient_reference or '',
            "title": title.strip(),
            "message": message.strip(),
            "priority": priority if priority in ['low', 'normal', 'urgent', 'emergency'] else 'normal',
            "is_demo": bool(is_demo),
            "reference_details": {
                k: v for k, v in (reference_details or {}).items()
                if str(k).lower().strip() not in {'patient_name', 'patient_id', 'mrn', 'medical_record_number', 'diagnosis', 'ssn', 'aadhaar', 'phone', 'dob'}
            }
        }

    @classmethod
    def stage_notification(
        cls,
        event_type: str,
        recipient_role: str,
        recipient_reference: str,
        title: str,
        message: str,
        notification_id: str,
        reference_details: Optional[Dict[str, Any]] = None,
        priority: str = 'normal',
        is_demo: bool = True
    ) -> Tuple[NotificationDelivery, bool]:
        """
        Stage 1 of Outbox Pattern:
        Executed INSIDE the active business transaction.
        Persists NotificationDelivery with status='pending'.
        
        Returns:
            (NotificationDelivery, created: bool)
            If created is False, record already existed (duplicate suppressed; original preserved intact).
        """
        existing = NotificationDelivery.objects.filter(notification_id=notification_id).first()
        if existing:
            logger.info("Duplicate notification %s detected. Preserving original status '%s'.",
                        notification_id, existing.status)
            return existing, False

        payload = cls.build_payload(
            notification_id=notification_id,
            event_type=event_type,
            recipient_role=recipient_role,
            recipient_reference=recipient_reference,
            title=title,
            message=message,
            reference_details=reference_details,
            priority=priority,
            is_demo=is_demo
        )

        delivery = NotificationDelivery.objects.create(
            notification_id=notification_id,
            event_type=event_type,
            recipient_role=recipient_role,
            recipient_reference=recipient_reference,
            title=title,
            message=message,
            priority=priority,
            status=NotificationStatus.PENDING,
            is_demo=is_demo,
            payload=payload,
            attempts=0
        )
        return delivery, True

    @classmethod
    def execute_dispatch(cls, delivery_id: Any) -> Tuple[bool, str]:
        """
        Stage 2 of Outbox Pattern:
        Executes external dispatch to Brevo (via transaction.on_commit or background sweeper).
        Never raises exceptions; records failure in NotificationDelivery safely.
        """
        try:
            delivery = NotificationDelivery.objects.get(id=delivery_id)
        except NotificationDelivery.DoesNotExist:
            logger.warning("NotificationDelivery ID %s not found for dispatch.", delivery_id)
            return False, "Delivery record not found."

        # If already submitted or terminal, do not re-dispatch
        if delivery.status in [
            NotificationStatus.SUBMITTED,
            NotificationStatus.SENT,
            NotificationStatus.DELIVERED,
            NotificationStatus.DEMONSTRATION_SENT,
            NotificationStatus.DUPLICATE_PREVENTED,
        ]:
            return True, f"Notification already in submitted/terminal state '{delivery.status}'."

        delivery.attempts += 1

        payload = delivery.payload or {}
        occurred_at = payload.get('occurred_at') or datetime.now(timezone.utc).isoformat()
        reference_details = payload.get('reference_details') or {}

        success, new_status, message_id, msg = BrevoEmailService.send_transactional_email(
            notification_id=delivery.notification_id,
            event_type=delivery.event_type,
            recipient_role=delivery.recipient_role,
            recipient_reference=delivery.recipient_reference,
            title=delivery.title,
            message=delivery.message,
            occurred_at=occurred_at,
            reference_details=reference_details,
            priority=delivery.priority,
            is_demo=delivery.is_demo
        )

        delivery.status = new_status
        if message_id:
            delivery.provider_message_id = message_id

        if success:
            delivery.error_message = None
        else:
            delivery.error_message = sanitize_log_message(msg)

        delivery.save(update_fields=['status', 'attempts', 'provider_message_id', 'error_message', 'updated_at'])
        return success, msg

    @classmethod
    def retry_pending_notifications(cls) -> int:
        """
        Outbox Sweeper: Dispatches any records stuck in PENDING or retryable FAILED.
        """
        candidates = NotificationDelivery.objects.filter(
            status__in=[NotificationStatus.PENDING, NotificationStatus.FAILED]
        )
        count = 0
        for delivery in candidates:
            if delivery.attempts < delivery.max_attempts:
                cls.execute_dispatch(delivery.id)
                count += 1
        return count
