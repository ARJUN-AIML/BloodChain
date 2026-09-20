from rest_framework import serializers
from .models import ForecastRecord

class ForecastRecordSerializer(serializers.ModelSerializer):
    facility_id = serializers.CharField(source='facility.id', read_only=True)
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = ForecastRecord
        fields = [
            'id', 'facility_id', 'facility_name', 'blood_group', 'component_type',
            'forecast_date', 'p10', 'p50', 'p90', 'protection_level',
            'model_name', 'prediction_interval_type', 'created_at'
        ]
