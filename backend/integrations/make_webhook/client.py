"""
BloodChain AI — Django Make.com Webhook Notification Client
===========================================================
Dispatches real-time event notifications to Make.com scenarios
for SMS alerts, email summaries, and logistics webhooks.

NOTE: Inventory authority remains within the Django PostgreSQL database.
Make.com handles only external notifications and communications.
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, Optional
import requests

logger = logging.getLogger(__name__)

class MakeWebhookClient:
    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url or os.environ.get('MAKE_WEBHOOK_URL', '')

    def dispatch_event(
        self,
        event_type: str,
        scenario_name: str,
        transfer_id: Optional[str] = None,
        source_facility: str = '',
        destination_facility: str = '',
        blood_group: str = '',
        component_type: str = '',
        units: int = 0,
        approver_name: Optional[str] = None,
        approver_role: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Dispatches an event payload to Make.com webhook."""
        payload = {
            'event': event_type,
            'scenario': scenario_name,
            'transfer_id': transfer_id,
            'source_facility': source_facility,
            'destination_facility': destination_facility,
            'blood_group': blood_group,
            'component_type': component_type,
            'units': units,
            'approver_name': approver_name,
            'approver_role': approver_role,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'synthetic_notice': 'SYNTHETIC DEMO DATA — NOT LIVE BLOOD AVAILABILITY',
            'extra': extra_data or {},
        }

        if self.webhook_url and self.webhook_url.startswith('http'):
            try:
                resp = requests.post(self.webhook_url, json=payload, timeout=5)
                if resp.status_code in (200, 201, 204):
                    logger.info("Successfully dispatched %s to Make.com webhook", event_type)
                    return {'success': True, 'simulated': False, 'status_code': resp.status_code, 'payload': payload}
                else:
                    logger.warning("Make.com webhook responded with status %s", resp.status_code)
            except Exception as exc:
                logger.warning("Failed to connect to Make.com webhook endpoint: %s", exc)

        # Fallback simulation log
        logger.info("[SIMULATED MAKE.COM NOTIFICATION] Event: %s, Payload: %s", event_type, payload)
        return {'success': True, 'simulated': True, 'message': 'Simulated notification logged', 'payload': payload}
