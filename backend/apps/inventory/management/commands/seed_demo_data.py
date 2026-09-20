import datetime
from django.core.management.base import BaseCommand
from apps.facilities.models import Facility, FacilityType
from apps.inventory.models import BloodInventory, InventoryBatch, BatchStatus
from apps.accounts.models import User, UserRole

DEMO_ORGANIZATIONS = [
    { 'id': 'HOSP_A', 'name': 'Metro General Hospital', 'type': 'HOSPITAL', 'region': 'Central', 'city': 'Metropolis', 'latitude': 28.6139, 'longitude': 77.2090, 'populationServed': 850000, 'bedCapacity': 1200, 'icuBeds': 80, 'emergencyCapacity': 120, 'isActive': True, 'address': '12 Medical Enclave, Metropolis', 'phone': '+91 11 2345 6789' },
    { 'id': 'HOSP_B', 'name': 'City Care Hospital', 'type': 'HOSPITAL', 'region': 'North', 'city': 'Northville', 'latitude': 28.7041, 'longitude': 77.1025, 'populationServed': 550000, 'bedCapacity': 800, 'icuBeds': 50, 'emergencyCapacity': 80, 'isActive': True, 'address': '45 Health Avenue, Northville', 'phone': '+91 11 3456 7890' },
    { 'id': 'HOSP_C', 'name': 'Sunrise Medical Center', 'type': 'HOSPITAL', 'region': 'East', 'city': 'Eastport', 'latitude': 28.5355, 'longitude': 77.3910, 'populationServed': 420000, 'bedCapacity': 600, 'icuBeds': 35, 'emergencyCapacity': 60, 'isActive': True, 'address': '88 Sunrise Expressway, Eastport', 'phone': '+91 11 4567 8901' },
    { 'id': 'HOSP_D', 'name': 'Heritage Multispecialty Hospital', 'type': 'HOSPITAL', 'region': 'South', 'city': 'Southtown', 'latitude': 28.4595, 'longitude': 77.0266, 'populationServed': 380000, 'bedCapacity': 500, 'icuBeds': 30, 'emergencyCapacity': 50, 'isActive': True, 'address': '102 Heritage Ring Road, Southtown', 'phone': '+91 11 5678 9012' },
    { 'id': 'HOSP_E', 'name': "Valley Children's Hospital", 'type': 'HOSPITAL', 'region': 'West', 'city': 'Westfield', 'latitude': 28.6304, 'longitude': 77.0819, 'populationServed': 290000, 'bedCapacity': 350, 'icuBeds': 25, 'emergencyCapacity': 40, 'isActive': True, 'address': '14 Pediatric Lane, Westfield', 'phone': '+91 11 6789 0123' },
    { 'id': 'BB_A', 'name': 'Regional Blood Center Alpha', 'type': 'BLOOD_BANK', 'region': 'Central', 'city': 'Metropolis', 'latitude': 28.6280, 'longitude': 77.2200, 'populationServed': 1500000, 'bedCapacity': 0, 'icuBeds': 0, 'emergencyCapacity': 0, 'isActive': True, 'address': '1 Central Donor Complex, Metropolis', 'phone': '+91 11 7890 1234' },
    { 'id': 'BB_B', 'name': 'Northern Blood Bank', 'type': 'BLOOD_BANK', 'region': 'North', 'city': 'Northville', 'latitude': 28.7200, 'longitude': 77.1100, 'populationServed': 900000, 'bedCapacity': 0, 'icuBeds': 0, 'emergencyCapacity': 0, 'isActive': True, 'address': '78 Northern Hub Road, Northville', 'phone': '+91 11 8901 2345' },
    { 'id': 'LOG_A', 'name': 'BloodRun Logistics', 'type': 'LOGISTICS', 'region': 'Central', 'city': 'Metropolis', 'latitude': 28.6100, 'longitude': 77.2300, 'populationServed': 0, 'bedCapacity': 0, 'icuBeds': 0, 'emergencyCapacity': 0, 'isActive': True, 'address': '3 Depot Gate, Metropolis', 'phone': '+91 11 9012 3456' },
]

BLOOD_GROUPS = ['A_POSITIVE','A_NEGATIVE','B_POSITIVE','B_NEGATIVE','AB_POSITIVE','AB_NEGATIVE','O_POSITIVE','O_NEGATIVE']
COMPONENTS = ['RBC','PLASMA','PLATELETS','WHOLE_BLOOD']

class Command(BaseCommand):
    help = 'Idempotently seeds synthetic demo facilities, inventory summaries, batches, and users.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding BloodChain synthetic demo data...")

        # 1. Seed Facilities
        facilities_map = {}
        for org in DEMO_ORGANIZATIONS:
            fac, _ = Facility.objects.update_or_create(
                id=org['id'],
                defaults={
                    'name': org['name'],
                    'facility_type': org['type'],
                    'region': org['region'],
                    'city': org['city'],
                    'latitude': org['latitude'],
                    'longitude': org['longitude'],
                    'population_served': org['populationServed'],
                    'bed_capacity': org['bedCapacity'],
                    'icu_beds': org['icuBeds'],
                    'emergency_capacity': org['emergencyCapacity'],
                    'is_active': org['isActive'],
                    'address': org['address'],
                    'phone': org['phone'],
                }
            )
            facilities_map[org['id']] = fac

        self.stdout.write(f"  [+] Facilities: {len(facilities_map)} loaded/updated.")

        # 2. Seed Users
        demo_users = [
            ('admin_user', 'ADMIN', 'System Admin'),
            ('approver_user', 'AUTHORIZED_APPROVER', 'Dr. Sarah Jenkins'),
            ('hospital_staff_user', 'HOSPITAL_STAFF', 'Nurse Alex Rivera'),
            ('bloodbank_staff_user', 'BLOOD_BANK_STAFF', 'Lab Tech Marcus Vance'),
            ('logistics_staff_user', 'LOGISTICS_STAFF', 'Courier Sam Drake'),
        ]
        for username, role, full_name in demo_users:
            if not User.objects.filter(username=username).exists():
                u = User.objects.create_user(username=username, email=f"{username}@bloodchain.local", password="password123")
                u.role = role
                u.first_name = full_name
                u.organization_id = 'HOSP_A'
                u.save()

        self.stdout.write("  [+] Demo Users loaded/updated.")

        # 3. Seed Inventory Summaries & Batches
        today = datetime.date.today()
        batch_count = 0
        summary_count = 0

        for fac_id in ['HOSP_A', 'HOSP_B', 'HOSP_C', 'HOSP_D', 'HOSP_E', 'BB_A', 'BB_B']:
            facility = facilities_map[fac_id]
            for bg in BLOOD_GROUPS:
                for comp in COMPONENTS:
                    is_hosp_a_o_pos_rbc = (fac_id == 'HOSP_A' and bg == 'O_POSITIVE' and comp == 'RBC')
                    avail = 10 if is_hosp_a_o_pos_rbc else (50 if 'BB' in fac_id else 25)
                    res = 2 if is_hosp_a_o_pos_rbc else 3

                    summary, _ = BloodInventory.objects.update_or_create(
                        facility=facility,
                        blood_group=bg,
                        component_type=comp,
                        defaults={
                            'available_units': avail,
                            'reserved_units': res,
                            'quarantined_units': 0,
                            'near_expiry_units': 2,
                            'incoming_units': 5,
                            'expected_expiry_units': 1,
                            'safety_stock_target': 15
                        }
                    )
                    summary_count += 1

                    # Seed sample physical batch
                    batch_num = f"BATCH-{fac_id}-{bg}-{comp}"
                    coll_date = today - datetime.timedelta(days=10)
                    exp_date = today + datetime.timedelta(days=3 if is_hosp_a_o_pos_rbc else 25)

                    InventoryBatch.objects.update_or_create(
                        batch_number=batch_num,
                        defaults={
                            'facility': facility,
                            'blood_group': bg,
                            'component_type': comp,
                            'collection_date': coll_date,
                            'expiry_date': exp_date,
                            'quantity': avail + res,
                            'reserved_quantity': res,
                            'status': BatchStatus.USABLE
                        }
                    )
                    batch_count += 1

        self.stdout.write(f"  [+] Inventory Summaries: {summary_count} records.")
        self.stdout.write(f"  [+] Inventory Batches: {batch_count} records.")
        self.stdout.write(self.style.SUCCESS("Demo data seed completed successfully (IDEMPOTENT)."))
