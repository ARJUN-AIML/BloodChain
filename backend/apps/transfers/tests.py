import uuid
from datetime import date, timedelta
from django.test import TestCase
from django.core.exceptions import PermissionDenied
from rest_framework.test import APIRequestFactory
from apps.facilities.models import Facility, FacilityType
from apps.inventory.models import BloodInventory, InventoryBatch, BatchStatus
from apps.inventory.services import calculate_safe_to_share, allocate_fefo
from apps.transfers.models import TransferRequest, TransferStatus
from apps.transfers.views import TransferRequestViewSet
from apps.audit.models import AuditEvent

class TransferBackendTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        TransferRequest.objects.all().delete()
        BloodInventory.objects.all().delete()
        InventoryBatch.objects.all().delete()
        Facility.objects.all().delete()
        AuditEvent.objects.hard_delete_all_for_testing()

        self.hosp_a = Facility.objects.create(id='HOSP_A', name='Metro General Hospital', facility_type=FacilityType.HOSPITAL)
        self.hosp_b = Facility.objects.create(id='HOSP_B', name='City Care Hospital', facility_type=FacilityType.HOSPITAL)

        self.inv_a = BloodInventory.objects.create(
            facility=self.hosp_a, blood_group='O_POSITIVE', component_type='RBC',
            available_units=50, reserved_units=5, safety_stock_target=15
        )

        self.inv_b = BloodInventory.objects.create(
            facility=self.hosp_b, blood_group='O_POSITIVE', component_type='RBC',
            available_units=10, reserved_units=0, safety_stock_target=15
        )

    def _create_transfer(self, status=TransferStatus.PENDING_APPROVAL, quantity=5):
        return TransferRequest.objects.create(
            id=str(uuid.uuid4()),
            source_facility=self.hosp_a,
            destination_facility=self.hosp_b,
            blood_group='O_POSITIVE',
            component_type='RBC',
            requested_quantity=quantity,
            status=status,
            source_deducted=False,
            destination_added=False
        )

    def _call_action(self, action_name, transfer_id, role=None, data=None):
        viewset = TransferRequestViewSet()
        viewset.action_map = {'post': action_name}
        viewset.kwargs = {'pk': transfer_id}
        viewset.format_kwarg = None
        extra = {}
        if role:
            extra['HTTP_X_USER_ROLE'] = role
        req = self.factory.post(f'/api/transfers/{transfer_id}/{action_name}/', data or {}, format='json', **extra)
        drf_req = viewset.initialize_request(req)
        viewset.request = drf_req
        action_method = getattr(viewset, action_name)
        return action_method(drf_req, pk=transfer_id)

    def _call_create(self, payload, role='HOSPITAL_STAFF'):
        viewset = TransferRequestViewSet()
        viewset.action_map = {'post': 'create'}
        viewset.format_kwarg = None
        req = self.factory.post('/api/transfers/', payload, format='json', HTTP_X_USER_ROLE=role)
        drf_req = viewset.initialize_request(req)
        viewset.request = drf_req
        return viewset.create(drf_req)

    # 1. Standard Role Authorization Tests
    def test_unauthorized_role_approval_rejected(self):
        """Unauthorized role (HOSPITAL_STAFF) must be rejected with HTTP 403."""
        transfer = self._create_transfer(TransferStatus.PENDING_APPROVAL)
        response = self._call_action('approve', transfer.id, role='HOSPITAL_STAFF')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['error'], 'UNAUTHORIZED_ROLE')

    def test_authorized_role_approval_success(self):
        """Authorized role (AUTHORIZED_APPROVER) succeeds and advances status to APPROVED."""
        transfer = self._create_transfer(TransferStatus.PENDING_APPROVAL)
        response = self._call_action('approve', transfer.id, role='AUTHORIZED_APPROVER')
        self.assertEqual(response.status_code, 200)
        transfer.refresh_from_db()
        self.assertEqual(transfer.status, TransferStatus.APPROVED)
        self.assertTrue(AuditEvent.objects.filter(action='TRANSFER_APPROVED', entity_id=transfer.id).exists())

    def test_invalid_state_transition_rejected(self):
        """Cannot dispatch transfer if status is PENDING_APPROVAL (must be APPROVED)."""
        transfer = self._create_transfer(TransferStatus.PENDING_APPROVAL)
        response = self._call_action('dispatch', transfer.id, role='LOGISTICS_STAFF')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'INVALID_STATE_TRANSITION')

    # 2. Insufficient Source Inventory
    def test_insufficient_source_inventory(self):
        """Creating transfer request exceeding source inventory returns HTTP 400."""
        payload = {
            'source_facility': self.hosp_a.id,
            'destination_facility': self.hosp_b.id,
            'blood_group': 'O_POSITIVE',
            'component_type': 'RBC',
            'requested_quantity': 100, # 100 > 50 avail
            'enforce_safe_share': False
        }
        response = self._call_create(payload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'INSUFFICIENT_INVENTORY')

    # 3. Zero and Negative Transfer Quantities
    def test_zero_and_negative_transfer_quantities(self):
        """Creating transfer request with quantity <= 0 returns HTTP 400."""
        payload_zero = {
            'source_facility': self.hosp_a.id,
            'destination_facility': self.hosp_b.id,
            'blood_group': 'O_POSITIVE',
            'component_type': 'RBC',
            'requested_quantity': 0
        }
        res_zero = self._call_create(payload_zero)
        self.assertEqual(res_zero.status_code, 400)
        self.assertEqual(res_zero.data['error'], 'INVALID_QUANTITY')

        payload_neg = {
            'source_facility': self.hosp_a.id,
            'destination_facility': self.hosp_b.id,
            'blood_group': 'O_POSITIVE',
            'component_type': 'RBC',
            'requested_quantity': -5
        }
        res_neg = self._call_create(payload_neg)
        self.assertEqual(res_neg.status_code, 400)
        self.assertEqual(res_neg.data['error'], 'INVALID_QUANTITY')

    # 4. Duplicate Transfer Requests
    def test_duplicate_transfer_requests(self):
        """Duplicate active transfer request for same facility pair and blood component returns HTTP 400."""
        self._create_transfer(TransferStatus.PENDING_APPROVAL)
        payload = {
            'source_facility': self.hosp_a.id,
            'destination_facility': self.hosp_b.id,
            'blood_group': 'O_POSITIVE',
            'component_type': 'RBC',
            'requested_quantity': 5
        }
        response = self._call_create(payload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'DUPLICATE_TRANSFER_REQUEST')

    # 5. Invalid Facility Combinations
    def test_invalid_facility_combinations(self):
        """Creating transfer where source equals destination facility returns HTTP 400."""
        payload = {
            'source_facility': self.hosp_a.id,
            'destination_facility': self.hosp_a.id, # Same facility
            'blood_group': 'O_POSITIVE',
            'component_type': 'RBC',
            'requested_quantity': 5
        }
        response = self._call_create(payload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'INVALID_FACILITY_COMBINATION')

    # 6. Unauthorized Dispatch and Receipt
    def test_unauthorized_dispatch_and_receipt(self):
        """Unauthorized roles attempting dispatch/receipt are rejected with HTTP 403."""
        t1 = self._create_transfer(TransferStatus.APPROVED)
        res_dispatch = self._call_action('dispatch', t1.id, role='HOSPITAL_STAFF')
        self.assertEqual(res_dispatch.status_code, 403)

        t2 = self._create_transfer(TransferStatus.IN_TRANSIT)
        res_receive = self._call_action('receive', t2.id, role='UNAUTHORIZED_ROLE')
        self.assertEqual(res_receive.status_code, 403)

    # 7. Concurrent Dispatch Attempts & Idempotency
    def test_concurrent_dispatch_attempts(self):
        """Idempotent dispatch deducts inventory exactly once across multiple calls."""
        transfer = self._create_transfer(TransferStatus.APPROVED)

        res1 = self._call_action('dispatch', transfer.id, role='LOGISTICS_STAFF')
        self.assertEqual(res1.status_code, 200)

        self.inv_a.refresh_from_db()
        self.assertEqual(self.inv_a.available_units, 45) # 50 - 5 = 45

        # Re-trigger dispatch on already dispatched/in-transit transfer
        transfer.refresh_from_db()
        transfer.status = TransferStatus.APPROVED
        transfer.save()

        res2 = self._call_action('dispatch', transfer.id, role='LOGISTICS_STAFF')
        self.assertEqual(res2.status_code, 200)

        self.inv_a.refresh_from_db()
        self.assertEqual(self.inv_a.available_units, 45) # Remains 45

    # 8. Concurrent Receipt Attempts & Idempotency
    def test_concurrent_receipt_attempts(self):
        """Idempotent receipt adds inventory exactly once across multiple calls."""
        transfer = self._create_transfer(TransferStatus.IN_TRANSIT)

        res1 = self._call_action('receive', transfer.id, role='LOGISTICS_STAFF')
        self.assertEqual(res1.status_code, 200)

        self.inv_b.refresh_from_db()
        self.assertEqual(self.inv_b.available_units, 15) # 10 + 5 = 15

        transfer.refresh_from_db()
        transfer.status = TransferStatus.IN_TRANSIT
        transfer.save()

        res2 = self._call_action('receive', transfer.id, role='LOGISTICS_STAFF')
        self.assertEqual(res2.status_code, 200)

        self.inv_b.refresh_from_db()
        self.assertEqual(self.inv_b.available_units, 15) # Remains 15

    # 9. Expired Inventory Exclusion
    def test_expired_inventory_exclusion(self):
        """Expired inventory batches are excluded from usable inventory calculation."""
        # Create expired batch
        InventoryBatch.objects.create(
            facility=self.hosp_a, batch_number='EXP-001', blood_group='O_POSITIVE',
            component_type='RBC', collection_date=date.today() - timedelta(days=45),
            expiry_date=date.today() - timedelta(days=5), quantity=20, status=BatchStatus.EXPIRED
        )
        # Create usable batch
        InventoryBatch.objects.create(
            facility=self.hosp_a, batch_number='USE-001', blood_group='O_POSITIVE',
            component_type='RBC', collection_date=date.today() - timedelta(days=10),
            expiry_date=date.today() + timedelta(days=25), quantity=30, status=BatchStatus.USABLE
        )

        safe_share = calculate_safe_to_share(self.hosp_a, 'O_POSITIVE', 'RBC')
        # Total usable = 30. Safety target = 15. Safe-to-share = 30 - 15 = 15 (expired 20 is ignored)
        self.assertEqual(safe_share, 15)

    # 10. Reserved Inventory Accounting
    def test_reserved_inventory_accounting(self):
        """Reserved inventory units reduce available share and safe-to-share calculations."""
        InventoryBatch.objects.create(
            facility=self.hosp_a, batch_number='RES-001', blood_group='O_POSITIVE',
            component_type='RBC', collection_date=date.today() - timedelta(days=5),
            expiry_date=date.today() + timedelta(days=30), quantity=30, reserved_quantity=10,
            status=BatchStatus.USABLE
        )

        batch = InventoryBatch.objects.get(batch_number='RES-001')
        self.assertEqual(batch.available_quantity, 20) # 30 - 10 = 20

    # 11. Safe-to-Share Limits
    def test_safe_to_share_limits(self):
        """Transfers exceeding Safe-to-Share limits are rejected with HTTP 400."""
        # inv_a: available_units=50, reserved_units=5, safety_stock_target=15 -> Safe-to-share = 50 - 5 - 15 = 30
        safe_share = calculate_safe_to_share(self.hosp_a, 'O_POSITIVE', 'RBC')
        self.assertEqual(safe_share, 30)

        payload_exceed = {
            'source_facility': self.hosp_a.id,
            'destination_facility': self.hosp_b.id,
            'blood_group': 'O_POSITIVE',
            'component_type': 'RBC',
            'requested_quantity': 35, # 35 > 30 safe-to-share
            'enforce_safe_share': True
        }
        res = self._call_create(payload_exceed)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['error'], 'EXCEEDS_SAFE_SHARE')

    # 12. FEFO Allocation Engine
    def test_fefo_allocation(self):
        """Dispatch allocates units from the earliest expiring usable batch first."""
        b_later = InventoryBatch.objects.create(
            facility=self.hosp_a, batch_number='FEFO-LATER', blood_group='O_POSITIVE',
            component_type='RBC', collection_date=date.today() - timedelta(days=5),
            expiry_date=date.today() + timedelta(days=30), quantity=20, status=BatchStatus.USABLE
        )
        b_sooner = InventoryBatch.objects.create(
            facility=self.hosp_a, batch_number='FEFO-SOONER', blood_group='O_POSITIVE',
            component_type='RBC', collection_date=date.today() - timedelta(days=10),
            expiry_date=date.today() + timedelta(days=10), quantity=10, status=BatchStatus.USABLE
        )

        allocations = allocate_fefo(self.hosp_a, 'O_POSITIVE', 'RBC', 8)
        self.assertEqual(len(allocations), 1)
        self.assertEqual(allocations[0][0], 'FEFO-SOONER') # Earliest expiring batch chosen first
        self.assertEqual(allocations[0][1], 8)

        b_sooner.refresh_from_db()
        self.assertEqual(b_sooner.quantity, 2) # 10 - 8 = 2

    # 13. Audit Event Immutable and Append-Only Hardening
    def test_audit_event_modification_and_bulk_deletion(self):
        """Audit log entries cannot be modified, deleted, or bulk deleted."""
        event = AuditEvent.objects.create(
            actor='test_user', role='ADMIN', action='TEST_ACTION',
            entity_type='TEST', entity_id='123'
        )

        # 1. Single delete raises PermissionDenied
        with self.assertRaises(PermissionDenied):
            event.delete()

        # 2. Single update raises PermissionDenied
        with self.assertRaises(PermissionDenied):
            event.actor = 'hacker'
            event.save()

        # 3. Bulk delete raises PermissionDenied
        with self.assertRaises(PermissionDenied):
            AuditEvent.objects.all().delete()

        # 4. Bulk update raises PermissionDenied
        with self.assertRaises(PermissionDenied):
            AuditEvent.objects.all().update(actor='hacker')
