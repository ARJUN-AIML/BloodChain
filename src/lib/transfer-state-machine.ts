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
 * Enforces strict clinical segregation: only AUTHORIZED_APPROVER holds approval authority.
 */
export function isAuthorizedApproverRole(role: UserRole): boolean {
  return role === 'AUTHORIZED_APPROVER';
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
  if (!record) {
    return {
      success: false,
      message: 'Invalid transfer record: record is required.',
      errorCode: 'INVALID_TRANSITION',
    };
  }

  // 1. Prevent duplicate transitions if already terminal
  if (record.status === 'RECEIVED' || record.status === 'REJECTED' || record.status === 'CANCELLED') {
    return {
      success: false,
      message: `Transfer ${record.id} is already in terminal status ${record.status}. Duplicate processing prevented.`,
      errorCode: 'ALREADY_COMPLETED',
    };
  }

  // 2. State Machine transition graph check (does the edge exist?)
  const allowedNext = VALID_TRANSITIONS[record.status] || [];
  if (!allowedNext.includes(nextStatus)) {
    return {
      success: false,
      message: `Invalid state transition from ${record.status} to ${nextStatus}. Allowed transitions: [${allowedNext.join(', ')}]`,
      errorCode: 'INVALID_TRANSITION',
    };
  }

  // 3. Authorization checks per status
  if (nextStatus === 'APPROVED') {
    if (!isAuthorizedApproverRole(actor.role)) {
      return {
        success: false,
        message: `Role ${actor.role} is not authorized to approve transfers. Clinical review requires AUTHORIZED_APPROVER.`,
        errorCode: 'UNAUTHORIZED_ROLE',
      };
    }
  }

  if (nextStatus === 'REJECTED') {
    if (!isAuthorizedApproverRole(actor.role)) {
      return {
        success: false,
        message: `Role ${actor.role} is not authorized to reject transfers. Requires AUTHORIZED_APPROVER.`,
        errorCode: 'UNAUTHORIZED_ROLE',
      };
    }
    if (!reason || !reason.trim()) {
      return {
        success: false,
        message: 'A mandatory non-empty clinical/operational reason is required when rejecting a transfer request.',
        errorCode: 'INVALID_TRANSITION',
      };
    }
  }

  if (nextStatus === 'IN_TRANSIT') {
    if (actor.role !== 'LOGISTICS_STAFF') {
      return {
        success: false,
        message: `Role ${actor.role} is not authorized to dispatch transfers. Only LOGISTICS_STAFF can initiate transit.`,
        errorCode: 'UNAUTHORIZED_ROLE',
      };
    }
  }

  if (nextStatus === 'RECEIVED') {
    if (actor.role !== 'LOGISTICS_STAFF' && actor.role !== 'BLOOD_BANK_STAFF') {
      return {
        success: false,
        message: `Role ${actor.role} is not authorized to confirm receipt. Delivery sign-off requires LOGISTICS_STAFF or BLOOD_BANK_STAFF.`,
        errorCode: 'UNAUTHORIZED_ROLE',
      };
    }
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
