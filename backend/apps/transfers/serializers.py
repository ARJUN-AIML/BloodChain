from rest_framework import serializers
from .models import TransferRequest

class TransferRequestSerializer(serializers.ModelSerializer):
    sourceFacilityId = serializers.CharField(source='source_facility.id', read_only=True)
    sourceFacilityName = serializers.CharField(source='source_facility.name', read_only=True)
    targetFacilityId = serializers.CharField(source='destination_facility.id', read_only=True)
    targetFacilityName = serializers.CharField(source='destination_facility.name', read_only=True)
    bloodGroup = serializers.CharField(source='blood_group', read_only=True)
    componentType = serializers.CharField(source='component_type', read_only=True)
    quantity = serializers.IntegerField(source='requested_quantity', read_only=True)

    class Meta:
        model = TransferRequest
        fields = [
            'id', 'sourceFacilityId', 'sourceFacilityName', 'targetFacilityId', 'targetFacilityName',
            'bloodGroup', 'componentType', 'quantity', 'requested_quantity', 'approved_quantity',
            'safe_share_quantity', 'status', 'priority', 'requested_by', 'approved_by',
            'rejection_reason', 'source_deducted', 'destination_added', 'created_at', 'updated_at'
        ]
