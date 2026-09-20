from rest_framework import serializers
from .models import InventoryBatch, BloodInventory, Reservation, UsageRecord, CollectionCampaign

class InventoryBatchSerializer(serializers.ModelSerializer):
    facility_id = serializers.CharField(source='facility.id', read_only=True)
    facility_name = serializers.CharField(source='facility.name', read_only=True)
    physical_quantity = serializers.IntegerField(read_only=True)
    available_quantity = serializers.IntegerField(read_only=True)

    class Meta:
        model = InventoryBatch
        fields = [
            'id', 'facility', 'facility_id', 'facility_name', 'batch_number',
            'blood_group', 'component_type', 'collection_date', 'expiry_date',
            'quantity', 'reserved_quantity', 'physical_quantity', 'available_quantity',
            'status', 'created_at', 'updated_at'
        ]

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Batch quantity cannot be negative.")
        return value

class BloodInventorySerializer(serializers.ModelSerializer):
    organizationId = serializers.CharField(source='facility.id', read_only=True)
    bloodGroup = serializers.CharField(source='blood_group', read_only=True)
    componentType = serializers.CharField(source='component_type', read_only=True)
    availableUnits = serializers.IntegerField(source='available_units', read_only=True)
    reservedUnits = serializers.IntegerField(source='reserved_units', read_only=True)
    quarantinedUnits = serializers.IntegerField(source='quarantined_units', read_only=True)
    nearExpiryUnits = serializers.IntegerField(source='near_expiry_units', read_only=True)
    incomingUnits = serializers.IntegerField(source='incoming_units', read_only=True)
    expectedExpiryUnits = serializers.IntegerField(source='expected_expiry_units', read_only=True)
    safetyStockTarget = serializers.IntegerField(source='safety_stock_target', read_only=True)

    class Meta:
        model = BloodInventory
        fields = [
            'id', 'facility', 'blood_group', 'component_type', 'available_units', 'reserved_units',
            'organizationId', 'bloodGroup', 'componentType',
            'availableUnits', 'reservedUnits', 'quarantinedUnits',
            'nearExpiryUnits', 'incomingUnits', 'expectedExpiryUnits', 'safetyStockTarget'
        ]

    def validate_available_units(self, value):
        if value < 0:
            raise serializers.ValidationError("Available units cannot be negative.")
        return value

class ReservationSerializer(serializers.ModelSerializer):
    facility_id = serializers.CharField(source='facility.id', read_only=True)

    class Meta:
        model = Reservation
        fields = ['id', 'facility_id', 'blood_group', 'component_type', 'quantity', 'status', 'created_at']

class UsageRecordSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = UsageRecord
        fields = ['id', 'facility', 'facility_name', 'blood_group', 'component_type', 'units_used', 'usage_date', 'recorded_by', 'created_at']

    def validate_units_used(self, value):
        if value <= 0:
            raise serializers.ValidationError("Units used must be greater than zero.")
        return value

class CollectionCampaignSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = CollectionCampaign
        fields = ['id', 'facility', 'facility_name', 'campaign_name', 'location', 'target_blood_groups', 'target_units', 'collected_units', 'campaign_date', 'status', 'created_by', 'created_at', 'updated_at']

    def validate_target_units(self, value):
        if value <= 0:
            raise serializers.ValidationError("Target units must be greater than zero.")
        return value

