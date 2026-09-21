import datetime
from django.core.management.base import BaseCommand
from apps.facilities.models import Facility, FacilityType
from apps.inventory.models import BloodInventory, InventoryBatch, BatchStatus
from apps.accounts.models import User, UserRole

# Tiruchirappalli (Trichy), Tamil Nadu — Synthetic Demo Nodes
DEMO_ORGANIZATIONS = [
    {
        'id': 'SIM_HOSP_TRY_MAIN',
        'name': 'Tiruchirappalli Regional Trauma Center (Simulated)',
        'type': 'HOSPITAL',
        'region': 'Tiruchirappalli City',
        'city': 'Tiruchirappalli',
        'latitude': 10.7925,
        'longitude': 78.6980,
        'populationServed': 1100000,
        'bedCapacity': 750,
        'icuBeds': 50,
        'emergencyCapacity': 90,
        'isActive': True,
        'address': 'Collector Office Road / Thillai Nagar, Tiruchirappalli, Tamil Nadu 620001',
        'phone': '+91 431 241 0001'
    },
    {
        'id': 'SIM_BB_TRY_CENTRAL',
        'name': 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
        'type': 'BLOOD_BANK',
        'region': 'Tiruchirappalli City',
        'city': 'Tiruchirappalli',
        'latitude': 10.8010,
        'longitude': 78.6920,
        'populationServed': 1600000,
        'bedCapacity': 0,
        'icuBeds': 0,
        'emergencyCapacity': 0,
        'isActive': True,
        'address': 'Central District Health Complex, Cantonment, Tiruchirappalli, Tamil Nadu 620001',
        'phone': '+91 431 241 5500'
    },
    {
        'id': 'SIM_LOG_TRY_FLEET',
        'name': 'Kaveri Cold-Chain Fleet Depot (Simulated)',
        'type': 'LOGISTICS',
        'region': 'Tiruchirappalli City',
        'city': 'Tiruchirappalli',
        'latitude': 10.7960,
        'longitude': 78.7050,
        'populationServed': 0,
        'bedCapacity': 0,
        'icuBeds': 0,
        'emergencyCapacity': 0,
        'isActive': True,
        'address': 'Highway Logistics Bypass, Palakkarai, Tiruchirappalli, Tamil Nadu 620008',
        'phone': '+91 431 246 8800'
    },
    {
        'id': 'SIM_HOSP_SRIRANGAM',
        'name': 'Srirangam Sub-District Hospital (Simulated)',
        'type': 'HOSPITAL',
        'region': 'Srirangam',
        'city': 'Srirangam',
        'latitude': 10.8650,
        'longitude': 78.6930,
        'populationServed': 280000,
        'bedCapacity': 250,
        'icuBeds': 15,
        'emergencyCapacity': 30,
        'isActive': True,
        'address': 'Gandhi Road, Srirangam, Tiruchirappalli, Tamil Nadu 620006',
        'phone': '+91 431 243 0012'
    },
    {
        'id': 'SIM_HOSP_THUVAKUDI',
        'name': 'Thuvakudi Industrial Corridor Health Center (Simulated)',
        'type': 'HOSPITAL',
        'region': 'Thuvakudi',
        'city': 'Thuvakudi',
        'latitude': 10.7620,
        'longitude': 78.8120,
        'populationServed': 220000,
        'bedCapacity': 180,
        'icuBeds': 12,
        'emergencyCapacity': 25,
        'isActive': True,
        'address': 'NH 83 Thanjavur Highway, Thuvakudi, Tiruchirappalli, Tamil Nadu 620015',
        'phone': '+91 431 250 1100'
    },
    {
        'id': 'SIM_HOSP_MANAPPARAI',
        'name': 'Manapparai Highway Trauma Unit (Simulated)',
        'type': 'HOSPITAL',
        'region': 'Manapparai',
        'city': 'Manapparai',
        'latitude': 10.6100,
        'longitude': 78.4200,
        'populationServed': 310000,
        'bedCapacity': 200,
        'icuBeds': 16,
        'emergencyCapacity': 35,
        'isActive': True,
        'address': 'NH 83 Dindigul Highway Junction, Manapparai, Tamil Nadu 621306',
        'phone': '+91 4332 261 100'
    },
    # Maintain legacy keys as aliases so existing tests pass seamlessly
    {
        'id': 'HOSP_A',
        'name': 'Tiruchirappalli Regional Trauma Center (Simulated)',
        'type': 'HOSPITAL',
        'region': 'Tiruchirappalli City',
        'city': 'Tiruchirappalli',
        'latitude': 10.7925,
        'longitude': 78.6980,
        'populationServed': 1100000,
        'bedCapacity': 750,
        'icuBeds': 50,
        'emergencyCapacity': 90,
        'isActive': True,
        'address': 'Collector Office Road / Thillai Nagar, Tiruchirappalli, Tamil Nadu 620001',
        'phone': '+91 431 241 0001'
    },
    {
        'id': 'BB_A',
        'name': 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
        'type': 'BLOOD_BANK',
        'region': 'Tiruchirappalli City',
        'city': 'Tiruchirappalli',
        'latitude': 10.8010,
        'longitude': 78.6920,
        'populationServed': 1600000,
        'bedCapacity': 0,
        'icuBeds': 0,
        'emergencyCapacity': 0,
        'isActive': True,
        'address': 'Central District Health Complex, Cantonment, Tiruchirappalli, Tamil Nadu 620001',
        'phone': '+91 431 241 5500'
    },
]

BLOOD_GROUPS = ['A_POSITIVE','A_NEGATIVE','B_POSITIVE','B_NEGATIVE','AB_POSITIVE','AB_NEGATIVE','O_POSITIVE','O_NEGATIVE']
COMPONENTS = ['RBC','PLASMA','PLATELETS','WHOLE_BLOOD']

class Command(BaseCommand):
    help = 'Idempotently seeds synthetic demo facilities, inventory summaries, batches, and users localized to Tiruchirappalli, Tamil Nadu.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding BloodChain synthetic demo data for Tiruchirappalli (Trichy)...")

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
            ('hospital_staff_user', 'HOSPITAL_STAFF', 'Staff Nurse K. Meena'),
            ('bloodbank_staff_user', 'BLOOD_BANK_STAFF', 'Lab Officer R. Senthil'),
            ('logistics_staff_user', 'LOGISTICS_STAFF', 'Courier M. Dinesh'),
        ]
        for username, role, full_name in demo_users:
            if not User.objects.filter(username=username).exists():
                u = User.objects.create_user(username=username, email=f"{username}@bloodchain.local", password="password123")
                u.role = role
                u.first_name = full_name
                u.organization_id = 'SIM_HOSP_TRY_MAIN'
                u.save()

        self.stdout.write("  [+] Demo Users loaded/updated.")

        # 3. Seed Inventory Summaries & Batches
        today = datetime.date.today()
        summary_count = 0

        for fac_id in ['SIM_HOSP_TRY_MAIN', 'SIM_BB_TRY_CENTRAL', 'SIM_HOSP_SRIRANGAM', 'SIM_HOSP_MANAPPARAI', 'HOSP_A', 'BB_A']:
            facility = facilities_map.get(fac_id)
            if not facility:
                continue

            for bg in BLOOD_GROUPS:
                for comp in COMPONENTS:
                    is_manapparai_o_neg_rbc = (fac_id == 'SIM_HOSP_MANAPPARAI' and bg == 'O_NEGATIVE' and comp == 'RBC')
                    avail = 1 if is_manapparai_o_neg_rbc else (30 if 'BB' in fac_id else 15)
                    res = 1 if is_manapparai_o_neg_rbc else 2

                    summary, _ = BloodInventory.objects.update_or_create(
                        facility=facility,
                        blood_group=bg,
                        component_type=comp,
                        defaults={
                            'available_units': avail,
                            'reserved_units': res,
                            'quarantined_units': 0,
                            'near_expiry_units': 1,
                            'incoming_units': 3,
                            'expected_expiry_units': 0,
                            'safety_stock_target': 10
                        }
                    )
                    summary_count += 1

        self.stdout.write(f"  [+] Inventory Summaries seeded: {summary_count} items.")
        self.stdout.write(self.style.SUCCESS("Synthetic Tiruchirappalli demo dataset successfully seeded."))
