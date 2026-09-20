from rest_framework import serializers, viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import SimulationRecord
from apps.audit.services import log_audit_event

class SimulationRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulationRecord
        fields = ['id', 'scenario_name', 'baseline_demand', 'modified_demand', 'risk_summary', 'created_by', 'created_at']

class SimulationRecordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SimulationRecord.objects.all().order_by('-created_at')
    serializer_class = SimulationRecordSerializer
    permission_classes = [AllowAny]

@api_view(['POST'])
@permission_classes([AllowAny])
def run_simulation_api(request):
    scenario = request.data.get('scenario', 'NORMAL')
    multiplier = 1.0
    if scenario == 'MASS_CASUALTY':
        multiplier = 2.0
    elif scenario == 'FLOODING':
        multiplier = 0.6
    elif scenario == 'POWER_OUTAGE':
        multiplier = 1.3

    record = SimulationRecord.objects.create(
        scenario_name=scenario,
        baseline_demand=100.0,
        modified_demand=round(100.0 * multiplier, 1),
        risk_summary={
            "scenario": scenario,
            "demandMultiplier": multiplier,
            "disclaimer": "Network simulation / digital-twin-style simulation using synthetic data"
        },
        created_by=request.data.get('user', 'SYSTEM')
    )

    log_audit_event(
        actor=record.created_by,
        role='ADMIN',
        action='SIMULATION_RUN',
        entity_type='SIMULATION',
        entity_id=str(record.id),
        details={"scenario": scenario, "multiplier": multiplier}
    )

    return Response({
        "id": record.id,
        "scenario": scenario,
        "demandMultiplier": multiplier,
        "baselineDemand": 100.0,
        "simulatedDemand": record.modified_demand,
        "disclaimer": "Network simulation / digital-twin-style simulation using synthetic data"
    })
