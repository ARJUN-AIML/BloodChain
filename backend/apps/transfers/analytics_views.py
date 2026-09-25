from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from apps.inventory.models import BloodInventory
from apps.transfers.models import TransferRequest, TransferStatus
from apps.facilities.models import Facility
from .matching_service import calculate_matching_sources

@api_view(['POST', 'GET'])
@permission_classes([AllowAny])
def calculate_matching_api(request):
    """
    POST payload or GET query params:
    destination_facility, blood_group, component_type, quantity
    Returns ranked compatible facilities with explainable matching scores.
    """
    data = request.data if request.method == 'POST' else request.query_params
    dest_id = data.get('destination_facility') or data.get('destinationFacilityId') or 'SIM_HOSP_MANAPPARAI'
    blood_group = data.get('blood_group') or data.get('bloodGroup') or 'O_NEGATIVE'
    component_type = data.get('component_type') or data.get('componentType') or 'RBC'
    try:
        quantity = int(data.get('quantity') or data.get('requested_quantity') or 1)
    except (ValueError, TypeError):
        quantity = 1

    matches = calculate_matching_sources(dest_id, blood_group, component_type, quantity)
    return Response({
        "status": "success",
        "destinationFacilityId": dest_id,
        "bloodGroup": blood_group,
        "componentType": component_type,
        "requestedQuantity": quantity,
        "matchCount": len(matches),
        "matches": matches
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def analytics_summary_api(request):
    """
    Calculates live dashboard statistics directly from persistent database tables.
    """
    total_usable = BloodInventory.objects.aggregate(total=Sum('available_units'))['total'] or 0
    total_reserved = BloodInventory.objects.aggregate(total=Sum('reserved_units'))['total'] or 0
    total_near_expiry = BloodInventory.objects.aggregate(total=Sum('near_expiry_units'))['total'] or 0

    active_transfers = TransferRequest.objects.filter(
        status__in=[TransferStatus.PENDING_APPROVAL, TransferStatus.APPROVED, TransferStatus.IN_TRANSIT]
    ).count()

    total_transfers = TransferRequest.objects.count()
    received_transfers = TransferRequest.objects.filter(status=TransferStatus.RECEIVED).count()
    fulfillment_rate = round((received_transfers / max(total_transfers, 1)) * 100, 1)

    critical_shortages = BloodInventory.objects.filter(available_units__lte=2).count()
    facilities_count = Facility.objects.filter(is_active=True).count()

    bg_distribution_raw = BloodInventory.objects.values('blood_group').annotate(units=Sum('available_units'))
    bg_distribution = [{
        'name': item['blood_group'].replace('_POSITIVE', '+').replace('_NEGATIVE', '-'),
        'value': item['units'] or 0
    } for item in bg_distribution_raw]

    return Response({
        "totalUsableInventory": total_usable,
        "totalReservedUnits": total_reserved,
        "totalNearExpiryUnits": total_near_expiry,
        "activeTransferCount": active_transfers,
        "criticalShortageCount": critical_shortages,
        "totalFacilitiesCount": facilities_count,
        "fulfillmentRate": fulfillment_rate,
        "bloodGroupDistribution": bg_distribution,
    })
