"""
BloodChain AI — Brevo Transactional Email Service
==================================================
Direct HTTPS integration with Brevo Transactional Email API:
POST https://api.brevo.com/v3/smtp/email

Header:
api-key: <BREVO_API_KEY>

Credentials strictly read from environment:
- BREVO_API_KEY
- BREVO_SENDER_EMAIL
- BREVO_SENDER_NAME
- BREVO_INTEGRATION_ENABLED

SECURITY INVARIANTS:
1. Secret sanitization: API keys and passwords never logged or returned in errors.
2. Acceptance semantics: HTTP 201/200 marks status as 'submitted' (queue acceptance, not delivery).
3. Zero business mutation: Email responses never alter inventory, transfer, or approval state.
4. Non-blocking: Timeouts and network failures are caught safely.
"""

import html
import logging
from typing import Any, Dict, Optional, Tuple
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

BREVO_API_ENDPOINT = "https://api.brevo.com/v3/smtp/email"

# Default role-to-demo-email mapping
ROLE_EMAIL_MAP = {
    'hospital_staff': 'hospital.staff@bloodchain.local',
    'authorized_approver': 'clinical.approver@bloodchain.local',
    'blood_bank_staff': 'bloodbank.hub@bloodchain.local',
    'logistics_staff': 'logistics.dispatch@bloodchain.local',
    'admin': 'admin.system@bloodchain.local',
}


def sanitize_brevo_secrets(msg: str) -> str:
    """Sanitizes Brevo API key and sensitive tokens from log messages and errors."""
    api_key = getattr(settings, 'BREVO_API_KEY', '') or ''
    secret_key = getattr(settings, 'SECRET_KEY', '') or ''

    sanitized = str(msg)
    for secret in [api_key, secret_key]:
        if secret and len(secret) > 4:
            sanitized = sanitized.replace(secret, '[REDACTED_API_KEY]')
    return sanitized


def resolve_recipient_email(recipient_role: str, recipient_reference: str, reference_details: Optional[Dict[str, Any]] = None) -> Tuple[str, str]:
    """
    Determines destination email address and display name for a given notification.
    """
    details = reference_details or {}
    recipient_email = details.get('recipient_email') or details.get('email')
    if not recipient_email:
        role_key = (recipient_role or '').lower().strip()
        recipient_email = ROLE_EMAIL_MAP.get(role_key, 'notifications@bloodchain.local')

    recipient_name = recipient_reference.strip() if recipient_reference else recipient_role.replace('_', ' ').title()
    return recipient_email, recipient_name


def format_brevo_html_email(
    title: str,
    message: str,
    event_type: str,
    notification_id: str,
    recipient_name: str,
    occurred_at: str,
    reference_details: Optional[Dict[str, Any]] = None
) -> str:
    """Generates clean, responsive HTML email body with clinical trust branding."""
    safe_title = html.escape(title)
    safe_message = html.escape(message)
    safe_event = html.escape(event_type.replace('_', ' ').upper())
    safe_notif_id = html.escape(notification_id)
    safe_recipient = html.escape(recipient_name)
    safe_time = html.escape(occurred_at)

    # Strictly forbidden patient-identifying fields to guarantee zero PHI in emails
    PHI_FORBIDDEN_KEYS = {'patient_name', 'patient_id', 'mrn', 'medical_record_number', 'diagnosis', 'ssn', 'aadhaar', 'phone', 'dob', 'recipient_email', 'email'}
    details = reference_details or {}
    detail_rows = ""
    for k, v in details.items():
        if str(k).lower().strip() not in PHI_FORBIDDEN_KEYS:
            detail_rows += f"<tr><td style='padding:6px 12px;color:#6b7280;font-size:13px;'>{html.escape(str(k).replace('_', ' ').title())}</td><td style='padding:6px 12px;font-weight:600;color:#111827;font-size:13px;'>{html.escape(str(v))}</td></tr>"

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>{safe_title}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;margin:0;padding:24px;color:#1e293b;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background:#881337;padding:20px 24px;color:#ffffff;">
      <h1 style="margin:0;font-size:18px;font-weight:700;letter-spacing:-0.02em;">BloodChain AI &bull; Clinical Logistics</h1>
      <p style="margin:4px 0 0 0;font-size:12px;opacity:0.9;">Tiruchirappalli Regional Network &bull; Automated Dispatch</p>
    </div>
    <div style="padding:12px 24px;background:#fef3c7;border-bottom:1px solid #fde68a;font-size:12px;color:#92400e;font-weight:600;">
      DEMONSTRATION ALERT &bull; SYNTHETIC CLINICAL DATA STREAM &bull; NOT LIVE BLOOD INVENTORY
    </div>
    <div style="padding:24px;">
      <span style="display:inline-block;padding:4px 10px;background:#f1f5f9;color:#475569;font-size:11px;font-weight:700;border-radius:4px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">{safe_event}</span>
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f172a;">{safe_title}</h2>
      <p style="margin:0 0 20px 0;font-size:15px;line-height:1.5;color:#334155;">{safe_message}</p>
      
      <div style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:12px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 12px;color:#6b7280;font-size:13px;">Recipient Reference</td><td style="padding:6px 12px;font-weight:600;color:#111827;font-size:13px;">{safe_recipient}</td></tr>
          <tr><td style="padding:6px 12px;color:#6b7280;font-size:13px;">Occurred At</td><td style="padding:6px 12px;font-weight:600;color:#111827;font-size:13px;">{safe_time}</td></tr>
          <tr><td style="padding:6px 12px;color:#6b7280;font-size:13px;">Notification ID</td><td style="padding:6px 12px;font-family:monospace;font-size:12px;color:#475569;">{safe_notif_id}</td></tr>
          {detail_rows}
        </table>
      </div>
      
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.4;">
        This is an automated transactional message generated by the BloodChain AI outbox delivery engine.
      </p>
    </div>
  </div>
</body>
</html>"""


class BrevoEmailService:
    """
    Dedicated service for sending transactional emails via Brevo's HTTPS API.
    """

    @classmethod
    def send_transactional_email(
        cls,
        notification_id: str,
        event_type: str,
        recipient_role: str,
        recipient_reference: str,
        title: str,
        message: str,
        occurred_at: str,
        reference_details: Optional[Dict[str, Any]] = None,
        priority: str = 'normal',
        is_demo: bool = True
    ) -> Tuple[bool, str, Optional[str], str]:
        """
        Dispatches transactional email to Brevo API.
        
        Returns:
            Tuple of:
            (success: bool, status: str, provider_message_id: Optional[str], message: str)
            
            Status:
            - 'submitted': Accepted by Brevo API (HTTP 201/200/202).
            - 'demonstration_sent': Local simulation when BREVO_INTEGRATION_ENABLED=False.
            - 'failed': HTTP error response or network timeout.
        """
        is_enabled = getattr(settings, 'BREVO_INTEGRATION_ENABLED', False)
        api_key = getattr(settings, 'BREVO_API_KEY', '') or ''
        sender_email = getattr(settings, 'BREVO_SENDER_EMAIL', '') or ''
        sender_name = getattr(settings, 'BREVO_SENDER_NAME', '') or 'BloodChain AI Emergency Notifications'

        recipient_email, recipient_name = resolve_recipient_email(
            recipient_role=recipient_role,
            recipient_reference=recipient_reference,
            reference_details=reference_details
        )

        # 1. Simulated / Demo Mode (Default)
        if not is_enabled:
            log_msg = sanitize_brevo_secrets(
                f"[SIMULATED BREVO EMAIL] Sender: {sender_email or '(unconfigured in .env)'} | To: {recipient_email} ({recipient_name}) | Subject: {title} | Event: {event_type} | ID: {notification_id}"
            )
            logger.info("%s", log_msg)
            return (
                True,
                'demonstration_sent',
                None,
                "Simulated Brevo email dispatch completed (BREVO_INTEGRATION_ENABLED=false)."
            )

        # 2. Live API Dispatch Mode
        if not api_key:
            err_msg = "BREVO_API_KEY is not configured in environment variables."
            logger.warning("Brevo dispatch failed: %s", err_msg)
            return False, 'failed', None, err_msg

        if not sender_email:
            err_msg = "BREVO_SENDER_EMAIL is not configured in environment variables. A verified Brevo sender email is required."
            logger.warning("Brevo dispatch failed: %s", err_msg)
            return False, 'failed', None, err_msg

        html_content = format_brevo_html_email(
            title=title,
            message=message,
            event_type=event_type,
            notification_id=notification_id,
            recipient_name=recipient_name,
            occurred_at=occurred_at,
            reference_details=reference_details
        )

        payload = {
            "sender": {
                "name": sender_name,
                "email": sender_email
            },
            "to": [
                {
                    "email": recipient_email,
                    "name": recipient_name
                }
            ],
            "subject": f"[BloodChain AI Demo] {title}",
            "htmlContent": html_content,
            "textContent": f"{title}\n\n{message}\n\nEvent: {event_type}\nNotification ID: {notification_id}\nTime: {occurred_at}",
            "tags": ["bloodchain-demo", event_type],
            "headers": {
                "X-BloodChain-Notification-Id": notification_id,
                "X-BloodChain-Event-Type": event_type
            }
        }

        headers = {
            "api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        try:
            response = requests.post(
                BREVO_API_ENDPOINT,
                json=payload,
                headers=headers,
                timeout=5.0
            )

            # Brevo returns HTTP 201 Created on acceptance with {"messageId": "<...>"}
            if response.status_code in (200, 201, 202):
                data = {}
                try:
                    data = response.json()
                except Exception:
                    pass
                message_id = data.get("messageId") or data.get("message_id")
                logger.info("Brevo accepted email for notification %s with messageId %s (status %s).",
                            notification_id, message_id, response.status_code)
                # Treat HTTP acceptance as submitted, not delivered
                return (
                    True,
                    'submitted',
                    message_id,
                    f"Successfully submitted to Brevo API (MessageId: {message_id or 'accepted'})."
                )
            else:
                err_msg = sanitize_brevo_secrets(
                    f"Brevo API error HTTP {response.status_code}: {response.text[:250]}"
                )
                logger.warning("Brevo API submission failed for %s: %s", notification_id, err_msg)
                return False, 'failed', None, err_msg

        except Exception as exc:
            err_msg = sanitize_brevo_secrets(f"Network error contacting Brevo API: {str(exc)}")
            logger.warning("Network failure during Brevo email dispatch for %s: %s", notification_id, err_msg)
            return False, 'failed', None, err_msg
