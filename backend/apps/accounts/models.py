from django.contrib.auth.models import AbstractUser
from django.db import models

class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', 'Administrator'
    AUTHORIZED_APPROVER = 'AUTHORIZED_APPROVER', 'Authorized Approver'
    HOSPITAL_STAFF = 'HOSPITAL_STAFF', 'Hospital Staff'
    BLOOD_BANK_STAFF = 'BLOOD_BANK_STAFF', 'Blood Bank Staff'
    LOGISTICS_STAFF = 'LOGISTICS_STAFF', 'Logistics Staff'

class User(AbstractUser):
    role = models.CharField(
        max_length=50,
        choices=UserRole.choices,
        default=UserRole.HOSPITAL_STAFF
    )
    organization_id = models.CharField(max_length=100, blank=True, null=True)
    organization_name = models.CharField(max_length=255, blank=True, null=True)

    def is_authorized_approver(self) -> bool:
        return self.role in [UserRole.ADMIN, UserRole.AUTHORIZED_APPROVER]

    def __str__(self):
        return f"{self.username} ({self.role})"
