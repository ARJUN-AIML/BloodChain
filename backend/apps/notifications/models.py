import uuid
from django.db import models

class NotificationEventType(models.TextChoices):
    TRANSFER_PENDING_APPROVAL = 'transfer_pending_approval', 'Transfer Pending Approval'
    TRANSFER_APPROVED = 'transfer_approved', 'Transfer Approved'
    TRANSFER_IN_TRANSIT = 'transfer_in_transit', 'Transfer In Transit'
    TRANSFER_RECEIVED = 'transfer_received', 'Transfer Received'
    LOW_STOCK_WARNING = 'low_stock_warning', 'Low Stock Warning'
    DEMAND_ESTIMATE_READY = 'demand_estimate_ready', 'Demand Estimate Ready'
    NOTIFICATION_TEST = 'notification_test', 'Notification Test'


class NotificationStatus(models.TextChoices):
    PENDING = 'pending', 'Pending Local Dispatch'
    SUBMITTED = 'submitted', 'Submitted to Email API Queue'
    SENT = 'sent', 'Accepted by Notification Provider'
    DELIVERED = 'delivered', 'Delivered to Recipient'
    DEMONSTRATION_SENT = 'demonstration_sent', 'Simulated Demonstration Sent'
    FAILED = 'failed', 'Delivery Failed'
    DUPLICATE_PREVENTED = 'duplicate_prevented', 'Duplicate Prevented'


class NotificationDelivery(models.Model):
    """
    Persistent outbox record for all external notification events.
    Created inside the same atomic database transaction as the business operation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification_id = models.CharField(
        max_length=150,
        unique=True,
        db_index=True,
        help_text="Deterministic business notification ID ensuring idempotency across retries."
    )
    event_type = models.CharField(max_length=50, choices=NotificationEventType.choices)
    recipient_role = models.CharField(max_length=50)
    recipient_reference = models.CharField(max_length=150, blank=True, default='')
    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=20, default='normal')
    status = models.CharField(
        max_length=30,
        choices=NotificationStatus.choices,
        default=NotificationStatus.PENDING,
        db_index=True
    )
    is_demo = models.BooleanField(default=True)
    payload = models.JSONField(default=dict)
    provider_message_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
        help_text="External Brevo message ID returned upon API acceptance."
    )
    attempts = models.PositiveIntegerField(default=1)
    max_attempts = models.PositiveIntegerField(default=3)
    error_message = models.TextField(blank=True, null=True)
    external_deduplication_detected = models.BooleanField(default=False)
    last_callback_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"Notification {self.notification_id} [{self.event_type}] - {self.status} (attempt {self.attempts}/{self.max_attempts})"

    @property
    def is_retryable(self) -> bool:
        return self.status in [NotificationStatus.PENDING, NotificationStatus.FAILED] and self.attempts < self.max_attempts
