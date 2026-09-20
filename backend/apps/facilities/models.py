from django.db import models

class FacilityType(models.TextChoices):
    HOSPITAL = 'HOSPITAL', 'Hospital'
    BLOOD_BANK = 'BLOOD_BANK', 'Blood Bank'
    LOGISTICS = 'LOGISTICS', 'Logistics Center'
    REGIONAL_ADMIN = 'REGIONAL_ADMIN', 'Regional Administration'

class Facility(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=255)
    facility_type = models.CharField(max_length=50, choices=FacilityType.choices, default=FacilityType.HOSPITAL)
    region = models.CharField(max_length=100, default='Central')
    city = models.CharField(max_length=100, default='Metropolis')
    latitude = models.FloatField(default=0.0)
    longitude = models.FloatField(default=0.0)
    population_served = models.IntegerField(default=0)
    bed_capacity = models.IntegerField(default=0)
    icu_beds = models.IntegerField(default=0)
    emergency_capacity = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    address = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.facility_type})"
