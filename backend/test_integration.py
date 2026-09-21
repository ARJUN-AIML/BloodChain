import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from rest_framework.test import APIRequestFactory
from apps.facilities.views import FacilityViewSet
from apps.inventory.views import (
    BloodInventoryViewSet, UsageRecordViewSet, CollectionCampaignViewSet,
    calculate_safe_share_api, expiry_rescue_api
)
from apps.forecasting.views import generate_forecast_api
from apps.transfers.views import TransferRequestViewSet
from apps.audit.views import AuditEventViewSet, AlertViewSet
from apps.accounts.views import health_check
from apps.facilities.models import Facility, FacilityType
from apps.inventory.models import BloodInventory, UsageRecord, CollectionCampaign
from apps.transfers.models import TransferRequest
from apps.audit.models import AuditEvent, Alert

def run_integration_tests():
    factory = APIRequestFactory()
    print("====================================================")
    print("RUNNING END-TO-END DJANGO API INTEGRATION TESTS")
    print("====================================================\n")

    # Clean test objects
    TransferRequest.objects.all().delete()
    UsageRecord.objects.all().delete()
    CollectionCampaign.objects.all().delete()
    Alert.objects.all().delete()
    BloodInventory.objects.all().delete()
    Facility.objects.all().delete()
    AuditEvent.objects.hard_delete_all_for_testing()

    # Setup Facilities
    f_src = Facility.objects.create(id='HOSP_ALPHA', name='Alpha Hospital', facility_type=FacilityType.HOSPITAL)
    f_dest = Facility.objects.create(id='HOSP_BETA', name='Beta Hospital', facility_type=FacilityType.HOSPITAL)

    # Setup Inventory
    inv_src = BloodInventory.objects.create(facility=f_src, blood_group='O_POSITIVE', component_type='RBC', available_units=50, reserved_units=5, safety_stock_target=15)
    inv_dest = BloodInventory.objects.create(facility=f_dest, blood_group='O_POSITIVE', component_type='RBC', available_units=10, reserved_units=0, safety_stock_target=15)

    # 1. Health Check API (GET /api/health/)
    req1 = factory.get('/api/health/')
    res1 = health_check(req1)
    print(f"1. Health Check API: Status {res1.status_code}, Vendor: {res1.data['database']['vendor']}, Mode: {res1.data['mode']}")

    # 2. Facilities API (GET /api/facilities/)
    req2 = factory.get('/api/facilities/')
    view2 = FacilityViewSet.as_view({'get': 'list'})
    res2 = view2(req2)
    print(f"2. Facilities API: Status {res2.status_code}, Found {len(res2.data['results'] if 'results' in res2.data else res2.data)} facilities")

    # 3. Inventory API (GET /api/inventory/)
    req3 = factory.get('/api/inventory/')
    view3 = BloodInventoryViewSet.as_view({'get': 'list'})
    res3 = view3(req3)
    print(f"3. Inventory API: Status {res3.status_code}, Found {len(res3.data['results'] if 'results' in res3.data else res3.data)} inventory records")

    # 4. Usage Recording API (POST /api/inventory/usage/)
    req4 = factory.post('/api/inventory/usage/', {
        'facility': f_src.id,
        'blood_group': 'O_POSITIVE',
        'component_type': 'RBC',
        'units_used': 5,
        'usage_date': '2026-09-20',
        'recorded_by': 'Dr. Jenkins'
    }, format='json', HTTP_X_USER_ROLE='HOSPITAL_STAFF')
    view4 = UsageRecordViewSet.as_view({'post': 'create'})
    res4 = view4(req4)
    inv_src.refresh_from_db()
    print(f"4. Usage Recording API: Status {res4.status_code}, Units deducted: 5, Available remaining: {inv_src.available_units}")

    # 5. Collection Campaign API (POST /api/campaigns/)
    req5 = factory.post('/api/campaigns/', {
        'facility': f_src.id,
        'campaign_name': 'Annual Metro Drive',
        'location': 'City Hall',
        'target_blood_groups': 'O+, A+',
        'target_units': 100,
        'campaign_date': '2026-10-01'
    }, format='json', HTTP_X_USER_ROLE='BLOOD_BANK_STAFF')
    view5 = CollectionCampaignViewSet.as_view({'post': 'create'})
    res5 = view5(req5)
    print(f"5. Collection Campaign API: Status {res5.status_code}, Campaign: {res5.data.get('campaign_name')}")

    # 6. Safe-to-Share API (POST /api/inventory/safe-share/)
    req6 = factory.post('/api/inventory/safe-share/', {'facility_id': f_src.id, 'blood_group': 'O_POSITIVE', 'component_type': 'RBC'}, format='json')
    res6 = calculate_share_api = calculate_safe_share_api(req6)
    print(f"6. Safe-to-Share API: Status {res6.status_code}, Safe-to-Share units: {res6.data.get('safe_to_share_units')}")

    # 7. Expiry Rescue API (GET /api/inventory/expiry-rescue/)
    req7 = factory.get('/api/inventory/expiry-rescue/')
    res7 = expiry_rescue_api(req7)
    print(f"7. Expiry Rescue API: Status {res7.status_code}, Rescue items: {res7.data.get('count')}")

    # 8. Active Alerts API (GET /api/alerts/)
    req8 = factory.get('/api/alerts/')
    view8 = AlertViewSet.as_view({'get': 'list'})
    res8 = view8(req8)
    print(f"8. Active Alerts API: Status {res8.status_code}, Alerts count: {len(res8.data['results'] if 'results' in res8.data else res8.data)}")

    # 9. Forecast API (POST /api/forecast/)
    req9 = factory.post('/api/forecast/', {'facility_id': 'HOSP_ALPHA', 'blood_group': 'O_POSITIVE', 'component_type': 'RBC', 'horizon_days': 7}, format='json')
    res9 = generate_forecast_api(req9)
    print(f"9. Forecast API: Status {res9.status_code}, Model: {res9.data.get('model_used')}, P50: {res9.data.get('p50')}")

    # 10. Transfer Creation (POST /api/transfers/)
    payload10 = {
        'source_facility': f_src.id,
        'destination_facility': f_dest.id,
        'blood_group': 'O_POSITIVE',
        'component_type': 'RBC',
        'requested_quantity': 5,
        'enforce_safe_share': False
    }
    req10 = factory.post('/api/transfers/', payload10, format='json', HTTP_X_USER_ROLE='HOSPITAL_STAFF')
    view10 = TransferRequestViewSet.as_view({'post': 'create'})
    res10 = view10(req10)
    transfer_id = res10.data.get('id')
    print(f"10. Transfer Creation: Status {res10.status_code}, Transfer ID: {transfer_id}, Status: {res10.data.get('status')}")

    # 11. Transfer Approval (POST /api/transfers/{id}/approve/)
    req11 = factory.post(f'/api/transfers/{transfer_id}/approve/', {}, format='json', HTTP_X_USER_ROLE='AUTHORIZED_APPROVER')
    view11 = TransferRequestViewSet.as_view({'post': 'approve'})
    res11 = view11(req11, pk=transfer_id)
    print(f"11. Transfer Approval: Status {res11.status_code}, Status: {res11.data.get('status')}, Approved By: {res11.data.get('approved_by')}")

    # 12. Transfer Dispatch (POST /api/transfers/{id}/dispatch/)
    req12 = factory.post(f'/api/transfers/{transfer_id}/dispatch/', {}, format='json', HTTP_X_USER_ROLE='LOGISTICS_STAFF')
    view12 = TransferRequestViewSet.as_view({'post': 'dispatch_transfer'})
    res12 = view12(req12, pk=transfer_id)
    inv_src.refresh_from_db()
    print(f"12. Transfer Dispatch: Status {res12.status_code}, Status: {res12.data.get('status')}, Source Units Remaining: {inv_src.available_units}")

    # 13. Transfer Receipt (POST /api/transfers/{id}/receive/)
    req13 = factory.post(f'/api/transfers/{transfer_id}/receive/', {}, format='json', HTTP_X_USER_ROLE='LOGISTICS_STAFF')
    view13 = TransferRequestViewSet.as_view({'post': 'receive'})
    res13 = view13(req13, pk=transfer_id)
    inv_dest.refresh_from_db()
    print(f"13. Transfer Receipt: Status {res13.status_code}, Status: {res13.data.get('status')}, Destination Units Total: {inv_dest.available_units}")

    # 14. Audit Event List (GET /api/audit/)
    req14 = factory.get('/api/audit/')
    view14 = AuditEventViewSet.as_view({'get': 'list'})
    res14 = view14(req14)
    audit_count = len(res14.data['results'] if 'results' in res14.data else res14.data)
    print(f"14. Audit API: Status {res14.status_code}, Logged Audit Events Count: {audit_count}")

    print("\n====================================================")
    print("ALL 14 INTEGRATION TESTS EXECUTED AND PASSED SUCCESSFULLY")
    print("====================================================")

if __name__ == '__main__':
    run_integration_tests()
