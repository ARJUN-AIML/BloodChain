from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import ForecastRecord
from .serializers import ForecastRecordSerializer
from apps.facilities.models import Facility
from apps.notifications.integration_service import NotificationService
from apps.notifications.models import NotificationEventType, NotificationStatus
from integrations.ml_service.client import MLServiceClient

class ForecastRecordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ForecastRecord.objects.all().order_by('-created_at')
    serializer_class = ForecastRecordSerializer
    permission_classes = [AllowAny]

@api_view(['POST'])
@permission_classes([AllowAny])
def generate_forecast_api(request):
    data = request.data
    facility_id = data.get('facility_id', 'HOSP_A')
    blood_group = data.get('blood_group', 'O_POSITIVE')
    component_type = data.get('component_type', 'RBC')
    horizon_days = int(data.get('horizon_days', 7))

    client = MLServiceClient()
    result = client.generate_forecast(facility_id, blood_group, component_type, horizon_days)

    with transaction.atomic():
        facility = Facility.objects.filter(id=facility_id).first()
        if facility:
            forecast_date = (timezone.now() + timedelta(days=horizon_days)).date()
            p50 = float(result.get('predictedUnits') or 12.0)
            p10 = float(result.get('p10') if result.get('p10') is not None else p50 * 0.8)
            p90 = float(result.get('p90') if result.get('p90') is not None else p50 * 1.3)
            if p10 > p50:
                p10 = p50
            if p90 < p50:
                p90 = p50

            forecast_record, _ = ForecastRecord.objects.get_or_create(
                facility=facility,
                blood_group=blood_group,
                component_type=component_type,
                forecast_date=forecast_date,
                defaults={
                    'p10': p10,
                    'p50': p50,
                    'p90': p90,
                    'protection_level': float(result.get('protectionLevel') or 0.85),
                    'model_name': str(result.get('modelName') or 'XGBoost'),
                }
            )

            delivery, created = NotificationService.stage_notification(
                event_type=NotificationEventType.DEMAND_ESTIMATE_READY,
                recipient_role='hospital_staff',
                recipient_reference=facility.name,
                title='Demand estimate ready',
                message=f'Blood demand forecast for {blood_group} {component_type} at {facility.name} is available ({round(p50)} units estimated).',
                reference_details={'forecast_record_id': str(forecast_record.id), 'facility_id': facility.id},
                priority='normal',
                notification_id=f'bc-notif-forecast-{forecast_record.id}'
            )
            if created and delivery.status == NotificationStatus.PENDING:
                delivery_id = delivery.id
                transaction.on_commit(lambda: NotificationService.execute_dispatch(delivery_id))

    return Response(result)
