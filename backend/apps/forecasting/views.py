from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import ForecastRecord
from .serializers import ForecastRecordSerializer
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
    return Response(result)
