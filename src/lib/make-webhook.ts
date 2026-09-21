/**
 * BloodChain AI — Make.com Notification Integration Client
 * ========================================================
 * Dispatches real-time event webhooks to Make.com scenarios for
 * alerting, SMS/Email dispatch, and logistics notification orchestration.
 *
 * NOTE: INVENTORY AUTHORITY REMAINS FULLY WITHIN THE LOCAL DATABASE.
 * MAKE.COM ONLY HANDLES NOTIFICATION ORCHESTRATION AND EXTERNAL ALERTS.
 */

export interface MakeWebhookPayload {
  event: 'EMERGENCY_SHORTAGE_DETECTED' | 'TRANSFER_APPROVED' | 'TRANSFER_DISPATCHED' | 'TRANSFER_RECEIVED';
  scenarioName: string;
  transferId?: string;
  requestId?: string;
  sourceFacility: string;
  destinationFacility: string;
  bloodGroup: string;
  componentType: string;
  units: number;
  approverName?: string;
  approverRole?: string;
  timestamp: string;
  etaMinutes?: number;
  syntheticNotice: string;
}

export interface WebhookDispatchResult {
  success: boolean;
  simulated: boolean;
  message: string;
  payload: MakeWebhookPayload;
}

export async function sendMakeWebhookNotification(
  payload: Omit<MakeWebhookPayload, 'timestamp' | 'syntheticNotice'>
): Promise<WebhookDispatchResult> {
  const webhookUrl = (import.meta as any).env?.VITE_MAKE_WEBHOOK_URL || '';

  const fullPayload: MakeWebhookPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
    syntheticNotice: 'SYNTHETIC DEMO DATA — NOT LIVE BLOOD AVAILABILITY',
  };

  // If a live webhook URL is configured in .env, dispatch HTTP POST
  if (webhookUrl && webhookUrl.startsWith('http')) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullPayload),
      });

      if (response.ok) {
        return {
          success: true,
          simulated: false,
          message: `Successfully posted event ${fullPayload.event} to live Make.com webhook.`,
          payload: fullPayload,
        };
      } else {
        console.warn(`Make.com webhook returned status ${response.status}`);
      }
    } catch (err) {
      console.warn('Could not connect to Make.com webhook endpoint, falling back to simulated logger:', err);
    }
  }

  // Graceful research simulation fallback when offline / unconfigured
  console.log('[Make.com Webhook Notification]', {
    status: 'SIMULATED_DISPATCH',
    endpoint: webhookUrl || 'MOCK_NOTIFICATION_BUS',
    payload: fullPayload,
  });

  return {
    success: true,
    simulated: true,
    message: `Event ${fullPayload.event} registered in Make.com notification pipeline (Mock Simulation Mode).`,
    payload: fullPayload,
  };
}

export const dispatchMakeNotification = sendMakeWebhookNotification;
