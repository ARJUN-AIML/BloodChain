from rest_framework import serializers
from .models import AuditEvent, Alert

class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = ['event_id', 'actor', 'role', 'action', 'entity_type', 'entity_id', 'details', 'timestamp', 'correlation_id']

class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = ['alert_id', 'facility_id', 'facility_name', 'alert_type', 'severity', 'blood_group', 'component_type', 'message', 'is_read', 'created_at']
