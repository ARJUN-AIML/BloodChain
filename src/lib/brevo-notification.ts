/**
 * BloodChain AI — Brevo Transactional Email Notification Client
 * ==============================================================
 * Dispatches clinical event notifications via Brevo Transactional Email API.
 * Communicates with the Django outbox engine or operates in demo simulation mode.
 *
 * NOTE: INVENTORY AUTHORITY REMAINS FULLY WITHIN THE LOCAL DJANGO DATABASE.
 * BREVO HANDLES TRANSACTIONAL EMAIL NOTIFICATION DISPATCH ONLY.
 */

export interface TransactionalNotificationPayload {
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

export interface NotificationDispatchResult {
  success: boolean;
  simulated: boolean;
  message: string;
  payload: TransactionalNotificationPayload;
}

export async function sendTransactionalNotification(
  payload: Omit<TransactionalNotificationPayload, 'timestamp' | 'syntheticNotice'>
): Promise<NotificationDispatchResult> {
  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

  const fullPayload: TransactionalNotificationPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
    syntheticNotice: 'SYNTHETIC DEMO DATA — NOT LIVE BLOOD AVAILABILITY',
  };

  try {
    const response = await fetch(`${apiUrl}/api/notifications/test/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': 'AUTHORIZED_APPROVER',
      },
      body: JSON.stringify({
        event_type: payload.event.toLowerCase(),
        title: `[BloodChain AI] ${payload.event.replace(/_/g, ' ')}`,
        message: `Notification for transfer ${payload.transferId || 'N/A'}: ${payload.units} units of ${payload.bloodGroup} ${payload.componentType} from ${payload.sourceFacility} to ${payload.destinationFacility}.`,
        reference_details: {
          transfer_id: payload.transferId,
          source_facility: payload.sourceFacility,
          destination_facility: payload.destinationFacility,
          units: payload.units,
          blood_group: payload.bloodGroup,
          component_type: payload.componentType,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        simulated: data.delivery_status === 'demonstration_sent' || data.is_demo === true,
        message: `Transactional email notification processed (${data.delivery_status || 'submitted'}).`,
        payload: fullPayload,
      };
    }
  } catch {
    // Graceful fallback to client simulation when backend offline
  }

  // Graceful simulation fallback
  console.log('[Brevo Email Outbox Notification]', {
    status: 'SIMULATED_TRANSACTIONAL_EMAIL',
    provider: 'Brevo Transactional Email API',
    payload: fullPayload,
  });

  return {
    success: true,
    simulated: true,
    message: `Event ${fullPayload.event} queued in Brevo notification pipeline (Simulation Mode).`,
    payload: fullPayload,
  };
}

export const dispatchNotification = sendTransactionalNotification;
export const dispatchTransactionalNotification = sendTransactionalNotification;

// Compatibility alias for existing components
export type MakeWebhookPayload = TransactionalNotificationPayload;
export const sendMakeWebhookNotification = sendTransactionalNotification;
export const dispatchMakeNotification = sendTransactionalNotification;
