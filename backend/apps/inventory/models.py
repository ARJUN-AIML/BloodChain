from django.db import models
from apps.facilities.models import Facility

class BloodGroup(models.TextChoices):
    A_POS = 'A_POSITIVE', 'A+'
    A_NEG = 'A_NEGATIVE', 'A-'
    B_POS = 'B_POSITIVE', 'B+'
    B_NEG = 'B_NEGATIVE', 'B-'
    AB_POS = 'AB_POSITIVE', 'AB+'
    AB_NEG = 'AB_NEGATIVE', 'AB-'
    O_POS = 'O_POSITIVE', 'O+'
    O_NEG = 'O_NEGATIVE', 'O-'

class ComponentType(models.TextChoices):
    RBC = 'RBC', 'Red Blood Cells'
    PLASMA = 'PLASMA', 'Plasma'
    PLATELETS = 'PLATELETS', 'Platelets'
    WHOLE_BLOOD = 'WHOLE_BLOOD', 'Whole Blood'

class BatchStatus(models.TextChoices):
    USABLE = 'USABLE', 'Usable'
    QUARANTINED = 'QUARANTINED', 'Quarantined'
    EXPIRED = 'EXPIRED', 'Expired'
    RESERVED = 'RESERVED', 'Reserved'

class InventoryBatch(models.Model):
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='batches')
    batch_number = models.CharField(max_length=100, unique=True)
    blood_group = models.CharField(max_length=20, choices=BloodGroup.choices)
    component_type = models.CharField(max_length=30, choices=ComponentType.choices)
    collection_date = models.DateField()
    expiry_date = models.DateField()
    quantity = models.IntegerField(default=0)
    reserved_quantity = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=BatchStatus.choices, default=BatchStatus.USABLE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def physical_quantity(self) -> int:
        return max(0, self.quantity)

    @property
    def available_quantity(self) -> int:
        if self.status != BatchStatus.USABLE:
            return 0
        return max(0, self.quantity - self.reserved_quantity)

    def __str__(self):
        return f"Batch {self.batch_number} - {self.facility.name} ({self.blood_group} {self.component_type}: {self.available_quantity} available)"

class BloodInventory(models.Model):
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='inventory_summaries')
    blood_group = models.CharField(max_length=20, choices=BloodGroup.choices)
    component_type = models.CharField(max_length=30, choices=ComponentType.choices)
    available_units = models.IntegerField(default=0)
    reserved_units = models.IntegerField(default=0)
    quarantined_units = models.IntegerField(default=0)
    near_expiry_units = models.IntegerField(default=0)
    incoming_units = models.IntegerField(default=0)
    expected_expiry_units = models.IntegerField(default=0)
    safety_stock_target = models.IntegerField(default=15)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('facility', 'blood_group', 'component_type')

    def __str__(self):
        return f"{self.facility.name} - {self.blood_group} {self.component_type} ({self.available_units} avail)"

class Reservation(models.Model):
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='reservations')
    blood_group = models.CharField(max_length=20, choices=BloodGroup.choices)
    component_type = models.CharField(max_length=30, choices=ComponentType.choices)
    quantity = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Reservation {self.id} for {self.facility.name}: {self.quantity} units"

class UsageRecord(models.Model):
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='usage_records')
    blood_group = models.CharField(max_length=20, choices=BloodGroup.choices)
    component_type = models.CharField(max_length=30, choices=ComponentType.choices)
    units_used = models.IntegerField(default=1)
    usage_date = models.DateField()
    recorded_by = models.CharField(max_length=255, default='SYSTEM')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Usage {self.facility.name}: {self.units_used} units {self.blood_group} on {self.usage_date}"

class CampaignStatus(models.TextChoices):
    PLANNED = 'PLANNED', 'Planned'
    ACTIVE = 'ACTIVE', 'Active'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'

class CollectionCampaign(models.Model):
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='campaigns')
    campaign_name = models.CharField(max_length=255)
    location = models.CharField(max_length=255, default='Main Blood Center')
    target_blood_groups = models.CharField(max_length=255, default='ALL')
    target_units = models.IntegerField(default=50)
    collected_units = models.IntegerField(default=0)
    campaign_date = models.DateField()
    status = models.CharField(max_length=20, choices=CampaignStatus.choices, default=CampaignStatus.PLANNED)
    created_by = models.CharField(max_length=255, default='SYSTEM')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Campaign '{self.campaign_name}' at {self.facility.name} ({self.status})"

