import uuid
from django.db import models
from django.core.exceptions import PermissionDenied

class AuditEventQuerySet(models.QuerySet):
    def delete(self):
        raise PermissionDenied("Audit log entries are append-only and cannot be deleted in bulk.")

    def update(self, **kwargs):
        raise PermissionDenied("Audit log entries are immutable and cannot be updated in bulk.")

class AuditEventManager(models.Manager):
    def get_queryset(self):
        return AuditEventQuerySet(self.model, using=self._db)

    def hard_delete_all_for_testing(self):
        return super(AuditEventQuerySet, self.get_queryset()).delete()

class AuditEvent(models.Model):
    event_id = models.CharField(max_length=100, primary_key=True, default=uuid.uuid4)
    actor = models.CharField(max_length=255, default='SYSTEM')
    role = models.CharField(max_length=50, default='SYSTEM')
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100)
    details = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)
    correlation_id = models.CharField(max_length=100, blank=True, null=True)

    objects = AuditEventManager()

    def save(self, *args, **kwargs):
        if self.pk and AuditEvent.objects.filter(pk=self.pk).exists():
            raise PermissionDenied("Audit log entries are immutable and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionDenied("Audit log entries are append-only and cannot be deleted.")

    def __str__(self):
        return f"Audit [{self.action}] by {self.actor} ({self.role}) at {self.timestamp}"

class AlertType(models.TextChoices):
    SHORTAGE = 'SHORTAGE', 'Critical Shortage'
    EXPIRY = 'EXPIRY', 'Near Expiry'
    LOW_STOCK = 'LOW_STOCK', 'Low Inventory'
    PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Transfer Approval'

class AlertSeverity(models.TextChoices):
    HIGH = 'HIGH', 'High'
    MEDIUM = 'MEDIUM', 'Medium'
    LOW = 'LOW', 'Low'

class Alert(models.Model):
    alert_id = models.CharField(max_length=100, primary_key=True, default=uuid.uuid4)
    facility_id = models.CharField(max_length=100)
    facility_name = models.CharField(max_length=255, default='Unknown Facility')
    alert_type = models.CharField(max_length=50, choices=AlertType.choices)
    severity = models.CharField(max_length=20, choices=AlertSeverity.choices, default=AlertSeverity.MEDIUM)
    blood_group = models.CharField(max_length=20, blank=True, null=True)
    component_type = models.CharField(max_length=30, blank=True, null=True)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Alert [{self.alert_type}] - {self.facility_name}: {self.message[:30]}"

