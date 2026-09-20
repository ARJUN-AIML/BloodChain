import type { User, UserRole, TransferRecommendation, InventorySummary } from '../types';
import { logAuditEvent } from './audit-store';

export type TransferStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface TransferStateRecord {
  id: string;
  recommendationId: string;
  status: TransferStatus;
  sourceOrgId: string;
  sourceOrgName: string;
  destinationOrgId: string;
  destinationOrgName: string;
  bloodGroup: string;
  componentType: string;
  quantity: number;
  approvedBy?: string;
  approvedAt?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  sourceDeducted: boolean;
  destinationAdded: boolean;
}

export interface TransitionResult {
  success: boolean;
  message: string;
  record?: TransferStateRecord;
  errorCode?: 'UNAUTHORIZED_ROLE' | 'INVALID_TRANSITION' | 'INSUFFICIENT_INVENTORY' | 'ALREADY_COMPLETED';
}

/**
 * Valid state transitions for the Transfer State Machine.
 */
const VALID_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['RECEIVED', 'CANCELLED'],
  REJECTED: [],
  RECEIVED: [],
  CANCELLED: [],
};

/**
 * Business logic check: Does the user have permission to authorize transfers?
 */
export function isAuthorizedApproverRole(role: UserRole): boolean {
  return role === 'AUTHORIZED_APPROVER' || role === 'ADMIN';
}

/**
 * Attempt to transition a transfer state record to a new status.
 * Enforces business-logic authorization, valid state machine transitions,
 * and idempotent inventory deduction/addition.
 */
export function transitionTransferState(
  record: TransferStateRecord,
  nextStatus: TransferStatus,
  actor: User,
  inventory: InventorySummary[],
  reason?: string
): TransitionResult {
  // 1. Authorization check for APPROVED transition
  if (nextStatus === 'APPROVED' || nextStatus === 'REJECTED') {
    if (!isAuthorizedApproverRole(actor.role)) {
      return {
        success: false,
        message: `Role ${actor.role} is not authorized to approve/reject transfers. Requires AUTHORIZED_APPROVER or ADMIN. (DEMO LOCAL AUTH)`,
        errorCode: 'UNAUTHORIZED_ROLE',
      };
    }
  }

  // 2. State Machine transition check
  const allowedNext = VALID_TRANSITIONS[record.status] || [];
  if (!allowedNext.includes(nextStatus)) {
    return {
      success: false,
      message: `Invalid state transition from ${record.status} to ${nextStatus}. Allowed transitions: [${allowedNext.join(', ')}]`,
      errorCode: 'INVALID_TRANSITION',
    };
  }

  // 3. Perform idempotent inventory reconciliation
  const updatedRecord = { ...record, status: nextStatus };

  if (nextStatus === 'APPROVED') {
    updatedRecord.approvedBy = actor.name;
    updatedRecord.approvedAt = new Date().toISOString();
  }

  if (nextStatus === 'IN_TRANSIT') {
    updatedRecord.dispatchedAt = new Date().toISOString();
    // Idempotent source deduction
    if (!updatedRecord.sourceDeducted) {
      const sourceInv = inventory.find(
        i => i.organizationId === record.sourceOrgId && i.bloodGroup === record.bloodGroup && i.componentType === record.componentType
      );
      if (sourceInv) {
        sourceInv.availableUnits = Math.max(0, sourceInv.availableUnits - record.quantity);
        updatedRecord.sourceDeducted = true;
      }
    }
  }

  if (nextStatus === 'RECEIVED') {
    updatedRecord.receivedAt = new Date().toISOString();
    // Idempotent destination addition
    if (!updatedRecord.destinationAdded) {
      const destInv = inventory.find(
        i => i.organizationId === record.destinationOrgId && i.bloodGroup === record.bloodGroup && i.componentType === record.componentType
      );
      if (destInv) {
        destInv.availableUnits = destInv.availableUnits + record.quantity;
        updatedRecord.destinationAdded = true;
      }
    }
  }

  // 4. Record Audit Log Entry
  logAuditEvent({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: `TRANSFER_${nextStatus}`,
    entityType: 'TRANSFER_RECORD',
    entityId: record.id,
    oldValue: record.status,
    newValue: nextStatus,
    reason: reason || `Transitioned transfer state from ${record.status} to ${nextStatus}`,
    recommendationId: record.recommendationId,
  });

  return {
    success: true,
    message: `Transfer ${record.id} successfully transitioned to ${nextStatus}.`,
    record: updatedRecord,
  };
}
