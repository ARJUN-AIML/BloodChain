from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import TransferRequest, TransferStatus
from .serializers import TransferRequestSerializer
from apps.facilities.models import Facility
from apps.inventory.models import BloodInventory, InventoryBatch, BatchStatus
from apps.inventory.services import calculate_safe_to_share, allocate_fefo
from apps.audit.services import log_audit_event
from apps.notifications.integration_service import NotificationService
from apps.notifications.models import NotificationEventType, NotificationStatus


AUTHORIZED_CREATE_ROLES = {'HOSPITAL_STAFF', 'BLOOD_BANK_STAFF'}
AUTHORIZED_APPROVE_ROLES = {'AUTHORIZED_APPROVER'}
AUTHORIZED_DISPATCH_ROLES = {'LOGISTICS_STAFF'}
AUTHORIZED_RECEIVE_ROLES = {'LOGISTICS_STAFF', 'BLOOD_BANK_STAFF'}

class TransferRequestViewSet(viewsets.ModelViewSet):
    serializer_class = TransferRequestSerializer
    authentication_classes = []
    permission_classes = [AllowAny]

    def get_queryset(self):
        return TransferRequest.objects.all().order_by('-created_at')

    def _get_user_role(self, request):
        meta = getattr(request, 'META', {})
        headers = getattr(request, 'headers', {})
        role_header = meta.get('HTTP_X_USER_ROLE') or headers.get('x-user-role') or headers.get('X-User-Role')
        role_data = None
        if hasattr(request, 'data') and isinstance(request.data, dict):
            role_data = request.data.get('user_role') or request.data.get('role')
        user = getattr(request, 'user', None)
        role_user = getattr(user, 'role', None) if user else None
        return role_user or role_header or role_data or 'HOSPITAL_STAFF'

    def _get_actor(self, request):
        meta = getattr(request, 'META', {})
        headers = getattr(request, 'headers', {})
        actor_header = meta.get('HTTP_X_USER_NAME') or headers.get('x-user-name') or headers.get('X-User-Name')
        user = getattr(request, 'user', None)
        actor_user = getattr(user, 'username', None) if user else None
        return actor_user or actor_header or 'Dr. Sarah Jenkins (Approver)'

    def create(self, request, *args, **kwargs):
        role = self._get_user_role(request)
        if role not in AUTHORIZED_CREATE_ROLES:
            return Response(
                {"error": "UNAUTHORIZED_ROLE", "message": f"Role '{role}' is not authorized to create transfer requests. Only Hospital Staff and Blood Bank Staff can request blood."},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data
        src_id = data.get('source_facility') or data.get('sourceFacilityId')
        dest_id = data.get('destination_facility') or data.get('targetFacilityId')
        blood_group = data.get('blood_group') or data.get('bloodGroup')
        component_type = data.get('component_type') or data.get('componentType')
        try:
            quantity = int(data.get('requested_quantity') or data.get('quantity') or 0)
        except (ValueError, TypeError):
            quantity = 0

        # 1. Zero and negative transfer quantities
        if quantity <= 0:
            return Response(
                {"error": "INVALID_QUANTITY", "message": "Quantity must be greater than zero."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Invalid facility combinations
        if src_id and dest_id and src_id == dest_id:
            return Response(
                {"error": "INVALID_FACILITY_COMBINATION", "message": "Source and destination facility cannot be the same."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Duplicate transfer requests
        if src_id and dest_id and blood_group and component_type:
            active_exists = TransferRequest.objects.filter(
                source_facility_id=src_id,
                destination_facility_id=dest_id,
                blood_group=blood_group,
                component_type=component_type,
                status__in=[TransferStatus.PENDING_APPROVAL, TransferStatus.APPROVED]
            ).exists()
            if active_exists:
                return Response(
                    {"error": "DUPLICATE_TRANSFER_REQUEST", "message": "An active transfer request already exists for this facility pair and blood component."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 4. Inventory checks (Insufficient Source Inventory / Safe-to-Share limits)
        if src_id and blood_group and component_type:
            try:
                src_facility = Facility.objects.get(id=src_id)
                summary = BloodInventory.objects.filter(
                    facility=src_facility,
                    blood_group=blood_group,
                    component_type=component_type
                ).first()
                avail = summary.available_units if summary else 0
                if quantity > avail:
                    return Response(
                        {"error": "INSUFFICIENT_INVENTORY", "message": f"Requested quantity ({quantity}) exceeds available source inventory ({avail})."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if data.get('enforce_safe_share', True):
                    safe_share = calculate_safe_to_share(src_facility, blood_group, component_type)
                    if quantity > safe_share:
                        return Response(
                            {"error": "EXCEEDS_SAFE_SHARE", "message": f"Requested quantity ({quantity}) exceeds safe-to-share limit ({safe_share})."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
            except Facility.DoesNotExist:
                pass

        try:
            src_fac = Facility.objects.get(id=src_id)
            dest_fac = Facility.objects.get(id=dest_id)
        except Facility.DoesNotExist:
            return Response(
                {"error": "FACILITY_NOT_FOUND", "message": "Source or destination facility not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        with transaction.atomic():
            transfer = TransferRequest.objects.create(
                source_facility=src_fac,
                destination_facility=dest_fac,
                blood_group=blood_group,
                component_type=component_type,
                requested_quantity=quantity,
                status=TransferStatus.PENDING_APPROVAL,
                priority=data.get('priority', 'URGENT'),
                requested_by=self._get_actor(request),
            )

            delivery, created = NotificationService.stage_notification(
                event_type=NotificationEventType.TRANSFER_PENDING_APPROVAL,
                recipient_role='authorized_approver',
                recipient_reference=transfer.source_facility.name,
                title='Transfer pending approval',
                message=f'Blood transfer request for {transfer.requested_quantity} units {transfer.blood_group} awaits clinical review.',
                reference_details={'transfer_reference': str(transfer.id)},
                priority=transfer.priority.lower(),
                notification_id=f'bc-notif-transfer_pending-{transfer.id}'
            )
            if created and delivery.status == NotificationStatus.PENDING:
                delivery_id = delivery.id
                transaction.on_commit(lambda: NotificationService.execute_dispatch(delivery_id))

        return Response(TransferRequestSerializer(transfer).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        role = self._get_user_role(request)
        actor = self._get_actor(request)

        if role not in AUTHORIZED_APPROVE_ROLES:
            return Response(
                {"error": "UNAUTHORIZED_ROLE", "message": f"Role '{role}' is not authorized to approve transfer requests. Clinical approval requires an Authorized Approver."},
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():
            try:
                transfer = TransferRequest.objects.select_for_update().get(pk=pk)
            except TransferRequest.DoesNotExist:
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

            if transfer.status != TransferStatus.PENDING_APPROVAL:
                return Response(
                    {"error": "INVALID_STATE_TRANSITION", "message": f"Cannot approve transfer in state '{transfer.status}'. Must be 'PENDING_APPROVAL'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            transfer.status = TransferStatus.APPROVED
            transfer.approved_by = actor
            transfer.save()

            log_audit_event(
                actor=actor,
                role=role,
                action='TRANSFER_APPROVED',
                entity_type='TRANSFER',
                entity_id=transfer.id,
                details={'status': transfer.status, 'quantity': transfer.requested_quantity}
            )

            delivery, created = NotificationService.stage_notification(
                event_type=NotificationEventType.TRANSFER_APPROVED,
                recipient_role='hospital_staff',
                recipient_reference=transfer.destination_facility.name,
                title='Transfer approved',
                message=f'Blood transfer of {transfer.requested_quantity} units {transfer.blood_group} has been approved.',
                reference_details={'transfer_reference': str(transfer.id)},
                priority=transfer.priority.lower(),
                notification_id=f'bc-notif-transfer_approved-{transfer.id}'
            )
            if created and delivery.status == NotificationStatus.PENDING:
                delivery_id = delivery.id
                transaction.on_commit(lambda: NotificationService.execute_dispatch(delivery_id))

        return Response(TransferRequestSerializer(transfer).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        role = self._get_user_role(request)
        actor = self._get_actor(request)

        if role not in AUTHORIZED_APPROVE_ROLES:
            return Response(
                {"error": "UNAUTHORIZED_ROLE", "message": f"Role '{role}' is not authorized to reject transfer requests. Clinical authorization required."},
                status=status.HTTP_403_FORBIDDEN
            )

        reason = str(request.data.get('reason', '') or '').strip()
        if not reason:
            return Response(
                {"error": "REJECTION_REASON_REQUIRED", "message": "A specific clinical or operational reason is required when rejecting a transfer request."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            try:
                transfer = TransferRequest.objects.select_for_update().get(pk=pk)
            except TransferRequest.DoesNotExist:
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

            if transfer.status != TransferStatus.PENDING_APPROVAL:
                return Response(
                    {"error": "INVALID_STATE_TRANSITION", "message": f"Cannot reject transfer in state '{transfer.status}'. Must be 'PENDING_APPROVAL'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            transfer.status = TransferStatus.REJECTED
            transfer.rejection_reason = reason
            transfer.save()

            log_audit_event(
                actor=actor,
                role=role,
                action='TRANSFER_REJECTED',
                entity_type='TRANSFER',
                entity_id=transfer.id,
                details={'status': transfer.status, 'reason': transfer.rejection_reason}
            )

        return Response(TransferRequestSerializer(transfer).data)

    @action(detail=True, methods=['post'], url_path='dispatch', url_name='dispatch')
    def dispatch_transfer(self, request, pk=None):
        role = self._get_user_role(request)
        if role not in AUTHORIZED_DISPATCH_ROLES:
            return Response(
                {"error": "UNAUTHORIZED_ROLE", "message": f"Role '{role}' is not authorized to dispatch transfers. Only Logistics Staff can initiate cold-chain transport."},
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():
            try:
                transfer = TransferRequest.objects.select_for_update().get(pk=pk)
            except TransferRequest.DoesNotExist:
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

            if transfer.status != TransferStatus.APPROVED:
                return Response(
                    {"error": "INVALID_STATE_TRANSITION", "message": f"Cannot dispatch transfer in state '{transfer.status}'. Must be 'APPROVED'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Idempotent deduction & FEFO allocation
            if not transfer.source_deducted:
                src_summary = BloodInventory.objects.select_for_update().filter(
                    facility=transfer.source_facility,
                    blood_group=transfer.blood_group,
                    component_type=transfer.component_type
                ).first()

                if src_summary:
                    if src_summary.available_units < transfer.requested_quantity:
                        return Response(
                            {"error": "INSUFFICIENT_INVENTORY", "message": "Insufficient source inventory at dispatch time."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    src_summary.available_units = max(0, src_summary.available_units - transfer.requested_quantity)
                    src_summary.save()

                # FEFO batch allocation
                allocate_fefo(
                    facility=transfer.source_facility,
                    blood_group=transfer.blood_group,
                    component_type=transfer.component_type,
                    quantity_needed=transfer.requested_quantity
                )

                transfer.source_deducted = True

            transfer.status = TransferStatus.IN_TRANSIT
            transfer.save()

            log_audit_event(
                actor=self._get_actor(request),
                role=role,
                action='TRANSFER_DISPATCHED',
                entity_type='TRANSFER',
                entity_id=transfer.id,
                details={'status': transfer.status, 'source_deducted': transfer.source_deducted}
            )

            delivery, created = NotificationService.stage_notification(
                event_type=NotificationEventType.TRANSFER_IN_TRANSIT,
                recipient_role='hospital_staff',
                recipient_reference=transfer.destination_facility.name,
                title='Transfer in transit',
                message=f'Cold-chain transport dispatched for {transfer.requested_quantity} units {transfer.blood_group}.',
                reference_details={'transfer_reference': str(transfer.id)},
                priority=transfer.priority.lower(),
                notification_id=f'bc-notif-transfer_dispatch-{transfer.id}'
            )
            if created and delivery.status == NotificationStatus.PENDING:
                delivery_id = delivery.id
                transaction.on_commit(lambda: NotificationService.execute_dispatch(delivery_id))

        return Response(TransferRequestSerializer(transfer).data)

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        role = self._get_user_role(request)
        if role not in AUTHORIZED_RECEIVE_ROLES:
            return Response(
                {"error": "UNAUTHORIZED_ROLE", "message": f"Role '{role}' is not authorized to receive transfers. Only Logistics Staff or Blood Bank Hub staff can verify transfer receipt."},
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():
            try:
                transfer = TransferRequest.objects.select_for_update().get(pk=pk)
            except TransferRequest.DoesNotExist:
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

            if transfer.status != TransferStatus.IN_TRANSIT:
                return Response(
                    {"error": "INVALID_STATE_TRANSITION", "message": f"Cannot receive transfer in state '{transfer.status}'. Must be 'IN_TRANSIT'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Idempotent addition
            if not transfer.destination_added:
                dest_summary, _ = BloodInventory.objects.select_for_update().get_or_create(
                    facility=transfer.destination_facility,
                    blood_group=transfer.blood_group,
                    component_type=transfer.component_type,
                    defaults={'available_units': 0, 'safety_stock_target': 15}
                )
                dest_summary.available_units += transfer.requested_quantity
                dest_summary.save()
                transfer.destination_added = True

            transfer.status = TransferStatus.RECEIVED
            transfer.save()

            log_audit_event(
                actor=self._get_actor(request),
                role=role,
                action='TRANSFER_RECEIVED',
                entity_type='TRANSFER',
                entity_id=transfer.id,
                details={'status': transfer.status, 'destination_added': transfer.destination_added}
            )

            delivery, created = NotificationService.stage_notification(
                event_type=NotificationEventType.TRANSFER_RECEIVED,
                recipient_role='blood_bank_staff',
                recipient_reference=transfer.source_facility.name,
                title='Transfer received',
                message=f'Delivery confirmed: {transfer.requested_quantity} units {transfer.blood_group} successfully received.',
                reference_details={'transfer_reference': str(transfer.id)},
                priority=transfer.priority.lower(),
                notification_id=f'bc-notif-transfer_received-{transfer.id}'
            )
            if created and delivery.status == NotificationStatus.PENDING:
                delivery_id = delivery.id
                transaction.on_commit(lambda: NotificationService.execute_dispatch(delivery_id))

        return Response(TransferRequestSerializer(transfer).data)
