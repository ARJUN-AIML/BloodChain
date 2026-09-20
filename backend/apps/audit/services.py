import uuid
from typing import Dict, Any
from .models import AuditEvent, Alert, AlertType, AlertSeverity

def log_audit_event(
    actor: str,
    role: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details: Dict[str, Any] = None,
    correlation_id: str = None
) -> AuditEvent:
    """
    Append-only audit event logging helper.
    """
    return AuditEvent.objects.create(
        event_id=str(uuid.uuid4()),
        actor=actor,
        role=role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details or {},
        correlation_id=correlation_id
    )

def create_alert(
    facility_id: str,
    facility_name: str,
    alert_type: str,
    message: str,
    severity: str = AlertSeverity.MEDIUM,
    blood_group: str = None,
    component_type: str = None
) -> Alert:
    """
    Creates an alert notification event. Prevents duplicate unread alerts for the same facility and alert type.
    """
    existing = Alert.objects.filter(
        facility_id=facility_id,
        alert_type=alert_type,
        blood_group=blood_group,
        component_type=component_type,
        is_read=False
    ).first()
    if existing:
        return existing

    return Alert.objects.create(
        alert_id=str(uuid.uuid4()),
        facility_id=facility_id,
        facility_name=facility_name,
        alert_type=alert_type,
        severity=severity,
        blood_group=blood_group,
        component_type=component_type,
        message=message,
        is_read=False
    )

