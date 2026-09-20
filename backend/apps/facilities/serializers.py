from rest_framework import serializers
from .models import Facility

class FacilitySerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='facility_type', read_only=True)

    class Meta:
        model = Facility
        fields = [
            'id', 'name', 'type', 'facility_type', 'region', 'city',
            'latitude', 'longitude', 'population_served', 'bed_capacity',
            'icu_beds', 'emergency_capacity', 'is_active', 'address', 'phone'
        ]
