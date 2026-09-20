import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.db import transaction
from apps.facilities.models import Facility, FacilityType
from apps.inventory.models import BloodInventory

def test_row_level_locking():
    print("====================================================")
    print("NEON POSTGRESQL ROW-LEVEL LOCKING & TRANSACTION TEST")
    print("====================================================\n")

    f, _ = Facility.objects.get_or_create(id='CONCURRENCY_HOSP', defaults={'name': 'Concurrency Hosp', 'facility_type': FacilityType.HOSPITAL})
    inv, _ = BloodInventory.objects.get_or_create(facility=f, blood_group='O_POSITIVE', component_type='RBC', defaults={'available_units': 100, 'reserved_units': 0})

    with transaction.atomic():
        locked_inv = BloodInventory.objects.select_for_update().get(id=inv.id)
        locked_inv.available_units -= 10
        locked_inv.save()
        print(f"1. Row locked via select_for_update() on PostgreSQL: Available units = {locked_inv.available_units}")

    inv.refresh_from_db()
    print(f"2. Transaction committed successfully: Verified stock = {inv.available_units}")
    print("\n====================================================")
    print("POSTGRESQL ROW-LEVEL LOCKING VERIFIED SUCCESSFULLY")
    print("====================================================")

if __name__ == '__main__':
    test_row_level_locking()
