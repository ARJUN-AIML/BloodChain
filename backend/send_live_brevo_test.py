"""
BloodChain AI — Send Live Brevo Demo Notification
=================================================
Dispatches a single real transactional email test to Brevo API.
Verifies HTTP 201 acceptance, captures Brevo messageId, and checks status.
"""

import os
import sys
import time
from dotenv import load_dotenv

# Load .env first
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')

import django
django.setup()

from django.conf import settings
from apps.notifications.models import NotificationDelivery, NotificationEventType, NotificationStatus
from apps.notifications.integration_service import NotificationService
from apps.notifications.brevo_service import BrevoEmailService


def main():
    print("=" * 60)
    print("BLOODCHAIN AI — LIVE BREVO DEMO NOTIFICATION DISPATCH")
    print("=" * 60)

    # 1. Inspect configured settings
    is_enabled = getattr(settings, 'BREVO_INTEGRATION_ENABLED', False)
    sender_email = getattr(settings, 'BREVO_SENDER_EMAIL', '')
    sender_name = getattr(settings, 'BREVO_SENDER_NAME', '')
    has_api_key = bool(getattr(settings, 'BREVO_API_KEY', ''))

    print(f"Integration Enabled: {is_enabled}")
    print(f"Sender Email:        {sender_email}")
    print(f"Sender Name:         {sender_name}")
    print(f"API Key Present:     {has_api_key}")

    if not is_enabled:
        print("\nERROR: BREVO_INTEGRATION_ENABLED is False. Enable it in .env first.")
        sys.exit(1)

    if not has_api_key:
        print("\nERROR: BREVO_API_KEY is not configured in .env.")
        sys.exit(1)

    recipient_email = os.environ.get("BREVO_TEST_RECIPIENT", os.environ.get("BREVO_SENDER_EMAIL", "demo-recipient@bloodchain.ai"))
    test_id = f"bc-notif-live-{int(time.time())}"

    print(f"\nTarget Recipient:    {recipient_email}")
    print(f"Notification ID:     {test_id}")
    print("Dispatching transactional email via Brevo HTTPS API...")

    # 2. Stage in outbox
    delivery, created = NotificationService.stage_notification(
        event_type=NotificationEventType.NOTIFICATION_TEST,
        recipient_role='admin',
        recipient_reference='System Administrator',
        title='BloodChain AI Emergency Network Alert',
        message='Demonstration notification: O-Negative supply rebalancing confirmed for Tiruchirappalli Central Blood Bank Hub.',
        notification_id=test_id,
        reference_details={
            'recipient_email': recipient_email,
            'source_facility': 'Tiruchirappalli Central Blood Bank Hub',
            'destination_facility': 'Manapparai Highway Trauma Unit',
            'blood_group': 'O_NEGATIVE',
            'component_type': 'RBC',
            'units_rebalanced': 6,
        },
        priority='urgent'
    )

    print(f"Outbox Staged:       Record ID {delivery.id}, Status: {delivery.status}")

    # 3. Execute dispatch
    success, msg = NotificationService.execute_dispatch(delivery.id)
    delivery.refresh_from_db()

    print("\n--- DISPATCH RESULT ---")
    print(f"Success:             {success}")
    print(f"Delivery Status:     {delivery.status}")
    print(f"Provider Message ID: {delivery.provider_message_id}")
    print(f"Attempts:            {delivery.attempts}")
    print(f"Result Message:      {msg}")

    if delivery.error_message:
        print(f"Error Message:       {delivery.error_message}")

    if success and delivery.provider_message_id:
        print("\n" + "=" * 60)
        print(" SUCCESS: Brevo accepted the transactional email!")
        print(f" Message ID: {delivery.provider_message_id}")
        print(f" Status:     {delivery.status} (accepted by Brevo queue)")
        print(f" Delivered to: {recipient_email}")
        print("=" * 60)
        sys.exit(0)
    else:
        print("\nFAILURE: Brevo did not accept the email.")
        sys.exit(1)


if __name__ == "__main__":
    main()
