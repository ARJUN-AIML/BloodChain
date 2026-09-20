from datetime import date
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import InventoryBatch, BloodInventory, Reservation, UsageRecord, CollectionCampaign
from .serializers import (
    InventoryBatchSerializer, BloodInventorySerializer, ReservationSerializer,
    UsageRecordSerializer, CollectionCampaignSerializer
)
from .services import calculate_safe_to_share
from apps.facilities.models import Facility
from apps.audit.services import log_audit_event, create_alert
from apps.audit.models import AlertType, AlertSeverity

class BloodInventoryViewSet(viewsets.ModelViewSet):
    queryset = BloodInventory.objects.all()
    serializer_class = BloodInventorySerializer
    permission_classes = [AllowAny]

class InventoryBatchViewSet(viewsets.ModelViewSet):
    queryset = InventoryBatch.objects.all().order_by('expiry_date')
    serializer_class = InventoryBatchSerializer
    permission_classes = [AllowAny]

class UsageRecordViewSet(viewsets.ModelViewSet):
    queryset = UsageRecord.objects.all().order_by('-usage_date')
    serializer_class = UsageRecordSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            usage = serializer.save()
            # Deduct inventory atomically if present
            summary = BloodInventory.objects.select_for_update().filter(
                facility=usage.facility,
                blood_group=usage.blood_group,
                component_type=usage.component_type
            ).first()

            if summary:
                summary.available_units = max(0, summary.available_units - usage.units_used)
                summary.save()

                # Trigger shortage alert if available stock falls below target
                if summary.available_units < summary.safety_stock_target:
                    create_alert(
                        facility_id=usage.facility.id,
                        facility_name=usage.facility.name,
                        alert_type=AlertType.LOW_STOCK,
                        severity=AlertSeverity.HIGH,
                        blood_group=usage.blood_group,
                        component_type=usage.component_type,
                        message=f"Low stock alert: {usage.facility.name} has only {summary.available_units} units of {usage.blood_group} {usage.component_type} (Target: {summary.safety_stock_target})."
                    )

            log_audit_event(
                actor=usage.recorded_by,
                role='HOSPITAL_STAFF',
                action='INVENTORY_USAGE_RECORDED',
                entity_type='USAGE_RECORD',
                entity_id=str(usage.id),
                details={
                    'facility_id': usage.facility.id,
                    'blood_group': usage.blood_group,
                    'units_used': usage.units_used
                }
            )

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class CollectionCampaignViewSet(viewsets.ModelViewSet):
    queryset = CollectionCampaign.objects.all().order_by('-campaign_date')
    serializer_class = CollectionCampaignSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        campaign = serializer.save()
        log_audit_event(
            actor=campaign.created_by,
            role='BLOOD_BANK_STAFF',
            action='COLLECTION_CAMPAIGN_CREATED',
            entity_type='CAMPAIGN',
            entity_id=str(campaign.id),
            details={'campaign_name': campaign.campaign_name, 'target_units': campaign.target_units}
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def calculate_safe_share_api(request):
    data = request.data
    facility_id = data.get('facility_id') or data.get('facility')
    blood_group = data.get('blood_group') or data.get('bloodGroup')
    component_type = data.get('component_type') or data.get('componentType') or 'RBC'

    if facility_id and blood_group:
        try:
            facility = Facility.objects.get(id=facility_id)
            safe_units = calculate_safe_to_share(facility, blood_group, component_type)
            return Response({
                "facility_id": facility.id,
                "facility_name": facility.name,
                "blood_group": blood_group,
                "component_type": component_type,
                "safe_to_share_units": safe_units,
                "formula": "max(0, Inventory - Reserved - Safety Target)"
            })
        except Facility.DoesNotExist:
            return Response({"error": "FACILITY_NOT_FOUND", "message": f"Facility {facility_id} not found."}, status=status.HTTP_404_NOT_FOUND)

    # Raw numbers fallback calculation
    total_inv = int(data.get('total_inventory', data.get('availableUnits', 0)))
    reserved = int(data.get('reserved_stock', data.get('reservedUnits', 0)))
    target = float(data.get('safety_target', data.get('safetyStockTarget', 15.0)))
    safe_units = max(0, int(total_inv - reserved - target))
    return Response({
        "safe_to_share_units": safe_units,
        "total_inventory": total_inv,
        "reserved_stock": reserved,
        "safety_target": target,
        "formula": "max(0, Inventory - Reserved - Safety Target)"
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def expiry_rescue_api(request):
    """
    FEFO Expiry Rescue Detection:
    Finds batches expiring within 7 days sorted by earliest expiry date.
    """
    today = date.today()
    expiring_batches = InventoryBatch.objects.filter(
        status='USABLE',
        quantity__gt=0,
        expiry_date__gte=today
    ).order_by('expiry_date')

    results = []
    for b in expiring_batches:
        days_left = (b.expiry_date - today).days
        if days_left <= 7:
            results.append({
                "batchId": b.batch_number,
                "facilityId": b.facility.id,
                "facilityName": b.facility.name,
                "bloodGroup": b.blood_group,
                "componentType": b.component_type,
                "quantity": b.available_quantity,
                "expiryDate": b.expiry_date.strftime('%Y-%m-%d'),
                "daysToExpiry": days_left,
                "rescueOpportunity": True if days_left <= 5 else False
            })

    return Response({
        "count": len(results),
        "fefoRule": "First Expiry, First Out (Sorted by earliest expiryDate)",
        "rescues": results
    })
