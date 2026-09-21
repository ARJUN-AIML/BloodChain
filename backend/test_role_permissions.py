import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from rest_framework.test import APIRequestFactory
from apps.facilities.models import Facility, FacilityType
from apps.inventory.models import BloodInventory, UsageRecord
from apps.transfers.models import TransferRequest, TransferStatus
from apps.transfers.views import TransferRequestViewSet
from apps.inventory.views import UsageRecordViewSet, BloodInventoryViewSet
from apps.audit.models import AuditEvent

def run_role_permission_tests():
    factory = APIRequestFactory()
    print("====================================================")
    print("RUNNING COMPREHENSIVE ROLE-TO-PERMISSION MATRIX TESTS")
    print("====================================================\n")

    # Clean test objects
    TransferRequest.objects.all().delete()
    UsageRecord.objects.all().delete()
    BloodInventory.objects.all().delete()
    Facility.objects.all().delete()
    AuditEvent.objects.hard_delete_all_for_testing()

    f_src = Facility.objects.create(id='PERM_HOSP_A', name='Perm Source Hospital', facility_type=FacilityType.HOSPITAL)
    f_dest = Facility.objects.create(id='PERM_HOSP_B', name='Perm Destination Hospital', facility_type=FacilityType.HOSPITAL)

    inv_src = BloodInventory.objects.create(
        facility=f_src, blood_group='O_NEGATIVE', component_type='RBC',
        available_units=100, reserved_units=5, safety_stock_target=10
    )
    inv_dest = BloodInventory.objects.create(
        facility=f_dest, blood_group='O_NEGATIVE', component_type='RBC',
        available_units=10, reserved_units=0, safety_stock_target=10
    )

    ROLES = ['ADMIN', 'AUTHORIZED_APPROVER', 'HOSPITAL_STAFF', 'BLOOD_BANK_STAFF', 'LOGISTICS_STAFF']

    # ----------------------------------------------------
    # 1. TEST: Transfer Creation
    # ----------------------------------------------------
    print("--- 1. Testing Transfer Request Creation ---")
    create_view = TransferRequestViewSet.as_view({'post': 'create'})
    
    for role in ROLES:
        payload = {
            'source_facility': f_src.id,
            'destination_facility': f_dest.id,
            'blood_group': 'O_NEGATIVE',
            'component_type': 'RBC',
            'requested_quantity': 2,
            'enforce_safe_share': False
        }
        req = factory.post('/api/transfers/', payload, format='json', HTTP_X_USER_ROLE=role)
        res = create_view(req)
        
        if role in ['HOSPITAL_STAFF', 'BLOOD_BANK_STAFF']:
            assert res.status_code == 201, f"Role {role} should be permitted to create transfer (got {res.status_code})"
            print(f"  [PASS] {role}: Allowed (201 Created)")
            # Clean up active transfer so duplicate check does not block subsequent test
            TransferRequest.objects.all().delete()
        else:
            assert res.status_code == 403, f"Role {role} should be DENIED creating transfer (got {res.status_code})"
            print(f"  [PASS] {role}: Denied (403 Forbidden)")

    # ----------------------------------------------------
    # 2. TEST: Transfer Approval
    # ----------------------------------------------------
    print("\n--- 2. Testing Transfer Approval ---")
    approve_view = TransferRequestViewSet.as_view({'post': 'approve'})

    for role in ROLES:
        # Create fresh pending transfer
        t = TransferRequest.objects.create(
            source_facility=f_src,
            destination_facility=f_dest,
            blood_group='O_NEGATIVE',
            component_type='RBC',
            requested_quantity=3,
            status=TransferStatus.PENDING_APPROVAL
        )
        req = factory.post(f'/api/transfers/{t.id}/approve/', {}, format='json', HTTP_X_USER_ROLE=role)
        res = approve_view(req, pk=t.id)

        if role == 'AUTHORIZED_APPROVER':
            assert res.status_code == 200, f"Authorized Approver should approve transfer (got {res.status_code})"
            t.refresh_from_db()
            assert t.status == TransferStatus.APPROVED
            print(f"  [PASS] {role}: Allowed (200 Approved, DB updated)")
        else:
            assert res.status_code == 403, f"Role {role} should be DENIED approving transfer (got {res.status_code})"
            t.refresh_from_db()
            assert t.status == TransferStatus.PENDING_APPROVAL
            print(f"  [PASS] {role}: Denied (403 Forbidden, Clinical protection preserved)")
        t.delete()

    # ----------------------------------------------------
    # 3. TEST: Transfer Rejection & Mandatory Reason
    # ----------------------------------------------------
    print("\n--- 3. Testing Transfer Rejection & Mandatory Reason ---")
    reject_view = TransferRequestViewSet.as_view({'post': 'reject'})

    # 3A: Empty reason should fail for Approver with 400
    t_rej_empty = TransferRequest.objects.create(
        source_facility=f_src, destination_facility=f_dest,
        blood_group='O_NEGATIVE', component_type='RBC', requested_quantity=2,
        status=TransferStatus.PENDING_APPROVAL
    )
    req_empty = factory.post(f'/api/transfers/{t_rej_empty.id}/reject/', {'reason': '   '}, format='json', HTTP_X_USER_ROLE='AUTHORIZED_APPROVER')
    res_empty = reject_view(req_empty, pk=t_rej_empty.id)
    assert res_empty.status_code == 400, f"Rejecting without reason must return 400 (got {res_empty.status_code})"
    print("  [PASS] AUTHORIZED_APPROVER (Empty reason): Rejected (400 Bad Request - Reason mandatory)")
    t_rej_empty.delete()

    # 3B: Rejection with valid reason
    for role in ROLES:
        t = TransferRequest.objects.create(
            source_facility=f_src, destination_facility=f_dest,
            blood_group='O_NEGATIVE', component_type='RBC', requested_quantity=2,
            status=TransferStatus.PENDING_APPROVAL
        )
        req = factory.post(f'/api/transfers/{t.id}/reject/', {'reason': 'Insufficient clinical justification.'}, format='json', HTTP_X_USER_ROLE=role)
        res = reject_view(req, pk=t.id)

        if role == 'AUTHORIZED_APPROVER':
            assert res.status_code == 200, f"Authorized Approver should be permitted to reject with reason (got {res.status_code})"
            t.refresh_from_db()
            assert t.status == TransferStatus.REJECTED
            assert t.rejection_reason == 'Insufficient clinical justification.'
            print(f"  [PASS] {role}: Allowed with reason (200 Rejected, DB reason saved)")
        else:
            assert res.status_code == 403, f"Role {role} should be DENIED rejecting transfer (got {res.status_code})"
            print(f"  [PASS] {role}: Denied (403 Forbidden)")
        t.delete()

    # ----------------------------------------------------
    # 4. TEST: Start Transport (Dispatch)
    # ----------------------------------------------------
    print("\n--- 4. Testing Start Transport (Dispatch) ---")
    dispatch_view = TransferRequestViewSet.as_view({'post': 'dispatch_transfer'})

    for role in ROLES:
        inv_src.available_units = 100
        inv_src.save()

        t = TransferRequest.objects.create(
            source_facility=f_src, destination_facility=f_dest,
            blood_group='O_NEGATIVE', component_type='RBC', requested_quantity=5,
            status=TransferStatus.APPROVED
        )
        req = factory.post(f'/api/transfers/{t.id}/dispatch/', {}, format='json', HTTP_X_USER_ROLE=role)
        res = dispatch_view(req, pk=t.id)

        if role == 'LOGISTICS_STAFF':
            assert res.status_code == 200, f"Logistics Staff should dispatch transfer (got {res.status_code})"
            t.refresh_from_db()
            inv_src.refresh_from_db()
            assert t.status == TransferStatus.IN_TRANSIT
            assert inv_src.available_units == 95
            print(f"  [PASS] {role}: Allowed (200 Dispatched, Units deducted: 100 -> 95)")
        else:
            assert res.status_code == 403, f"Role {role} should be DENIED dispatching transfer (got {res.status_code})"
            inv_src.refresh_from_db()
            assert inv_src.available_units == 100
            print(f"  [PASS] {role}: Denied (403 Forbidden, Inventory untouched)")
        t.delete()

    # ----------------------------------------------------
    # 5. TEST: Confirm Receipt
    # ----------------------------------------------------
    print("\n--- 5. Testing Confirm Delivery / Receipt ---")
    receive_view = TransferRequestViewSet.as_view({'post': 'receive'})

    for role in ROLES:
        inv_dest.available_units = 10
        inv_dest.save()

        t = TransferRequest.objects.create(
            source_facility=f_src, destination_facility=f_dest,
            blood_group='O_NEGATIVE', component_type='RBC', requested_quantity=5,
            status=TransferStatus.IN_TRANSIT, source_deducted=True
        )
        req = factory.post(f'/api/transfers/{t.id}/receive/', {}, format='json', HTTP_X_USER_ROLE=role)
        res = receive_view(req, pk=t.id)

        if role in ['LOGISTICS_STAFF', 'BLOOD_BANK_STAFF']:
            assert res.status_code == 200, f"Role {role} should be permitted to confirm receipt (got {res.status_code})"
            t.refresh_from_db()
            inv_dest.refresh_from_db()
            assert t.status == TransferStatus.RECEIVED
            assert inv_dest.available_units == 15
            print(f"  [PASS] {role}: Allowed (200 Received, Units credited: 10 -> 15)")
        else:
            assert res.status_code == 403, f"Role {role} should be DENIED confirming receipt (got {res.status_code})"
            inv_dest.refresh_from_db()
            assert inv_dest.available_units == 10
            print(f"  [PASS] {role}: Denied (403 Forbidden, Delivery unverified)")
        t.delete()

    # ----------------------------------------------------
    # 6. TEST: Usage Recording (Hospital Inventory Modification)
    # ----------------------------------------------------
    print("\n--- 6. Testing Ward Usage Recording ---")
    usage_view = UsageRecordViewSet.as_view({'post': 'create'})

    for role in ROLES:
        inv_src.available_units = 50
        inv_src.save()

        payload = {
            'facility': f_src.id,
            'blood_group': 'O_NEGATIVE',
            'component_type': 'RBC',
            'units_used': 3,
            'usage_date': '2026-09-21',
            'recorded_by': 'Dr. Perm Test'
        }
        req = factory.post('/api/inventory/usage/', payload, format='json', HTTP_X_USER_ROLE=role)
        res = usage_view(req)

        if role == 'HOSPITAL_STAFF':
            assert res.status_code == 201, f"Hospital Staff should record usage (got {res.status_code})"
            inv_src.refresh_from_db()
            assert inv_src.available_units == 47
            print(f"  [PASS] {role}: Allowed (201 Created, Local units deducted: 50 -> 47)")
        else:
            assert res.status_code == 403, f"Role {role} should be DENIED recording usage (got {res.status_code})"
            inv_src.refresh_from_db()
            assert inv_src.available_units == 50
            print(f"  [PASS] {role}: Denied (403 Forbidden)")

    # ----------------------------------------------------
    # 7. TEST: Direct Inventory Total Overwrites Forbidden
    # ----------------------------------------------------
    print("\n--- 7. Testing Prevention of Direct Inventory Total Overwrite ---")
    inv_view_create = BloodInventoryViewSet.as_view({'post': 'create'})
    inv_view_update = BloodInventoryViewSet.as_view({'put': 'update'})
    inv_view_delete = BloodInventoryViewSet.as_view({'delete': 'destroy'})

    for role in ROLES:
        # Attempt direct create
        req_c = factory.post('/api/inventory/', {'available_units': 999}, format='json', HTTP_X_USER_ROLE=role)
        res_c = inv_view_create(req_c)
        assert res_c.status_code == 403, f"Direct inventory creation must be 403 for {role}"

        # Attempt direct update
        req_u = factory.put(f'/api/inventory/{inv_src.id}/', {'available_units': 999}, format='json', HTTP_X_USER_ROLE=role)
        res_u = inv_view_update(req_u, pk=inv_src.id)
        assert res_u.status_code == 403, f"Direct inventory total update must be 403 for {role}"

        # Attempt direct delete
        req_d = factory.delete(f'/api/inventory/{inv_src.id}/', format='json', HTTP_X_USER_ROLE=role)
        res_d = inv_view_delete(req_d, pk=inv_src.id)
        assert res_d.status_code == 403, f"Direct inventory deletion must be 403 for {role}"

    print("  [PASS] ALL ROLES: Direct inventory total create/update/delete strictly blocked (403 Forbidden)")

    print("\n====================================================")
    print("ALL 35 ROLE-TO-PERMISSION MATRIX COMBINATIONS PASSED VERIFICATION")
    print("====================================================")

if __name__ == '__main__':
    run_role_permission_tests()
