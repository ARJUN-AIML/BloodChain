import uuid
from django.db import models
from apps.facilities.models import Facility

class TransferStatus(models.TextChoices):
    PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Approval'
    APPROVED = 'APPROVED', 'Approved'
    IN_TRANSIT = 'IN_TRANSIT', 'In Transit'
    RECEIVED = 'RECEIVED', 'Received'
    REJECTED = 'REJECTED', 'Rejected'
    CANCELLED = 'CANCELLED', 'Cancelled'

class TransferPriority(models.TextChoices):
    ROUTINE = 'ROUTINE', 'Routine'
    URGENT = 'URGENT', 'Urgent'
    EMERGENCY = 'EMERGENCY', 'Emergency'

class TransferRequest(models.Model):
    id = models.CharField(max_length=100, primary_key=True, default=uuid.uuid4)
    source_facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='outgoing_transfers')
    destination_facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='incoming_transfers')
    blood_group = models.CharField(max_length=20)
    component_type = models.CharField(max_length=30)
    requested_quantity = models.IntegerField(default=1)
    approved_quantity = models.IntegerField(default=1)
    safe_share_quantity = models.IntegerField(default=0)
    status = models.CharField(max_length=30, choices=TransferStatus.choices, default=TransferStatus.PENDING_APPROVAL)
    priority = models.CharField(max_length=20, choices=TransferPriority.choices, default=TransferPriority.URGENT)
    requested_by = models.CharField(max_length=255, default='SYSTEM')
    approved_by = models.CharField(max_length=255, blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    source_deducted = models.BooleanField(default=False)
    destination_added = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Transfer {self.id[:8]} ({self.status}): {self.source_facility.name} -> {self.destination_facility.name} ({self.requested_quantity} units {self.blood_group})"
