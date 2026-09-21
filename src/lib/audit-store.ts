import { create } from 'zustand';
import type { AuditLogEntry, UserRole } from '@/types';

interface AuditState {
  logs: AuditLogEntry[];
  logAction: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  getLogsByEntity: (entityId: string) => AuditLogEntry[];
  clearLogs: () => void;
}

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'LOG_001',
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    userId: 'SYS_ML_ENGINE',
    userName: 'Automated Demand Estimation System',
    userRole: 'ADMIN',
    action: 'PREDICTION_GENERATED',
    entityType: 'FORECAST',
    entityId: 'HOSP_A_O_POS_RBC',
    oldValue: 'Estimated requirement: 22 units',
    newValue: 'Estimated requirement: 24 units',
    reason: 'The system created an estimate of the blood units that may be needed over the next 72 hours using available demonstration information.',
    displayTitle: 'Blood Demand Estimate Created',
    displayCategory: 'Demand Estimate',
    displayPerformer: 'Automated Demand Estimation System',
    displayExplanation: 'The system created an estimate of the blood units that may be needed over the next 72 hours using available demonstration information.',
    displayNote: 'Demonstration estimate — not medically validated.',
    isDemonstration: true,
  },
  {
    id: 'LOG_002',
    timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
    userId: 'SYS_SHORTAGE_ENGINE',
    userName: 'Automated Stock Monitoring System',
    userRole: 'ADMIN',
    action: 'SHORTAGE_FLAGGED',
    entityType: 'SHORTAGE_RISK',
    entityId: 'SHORT_01',
    oldValue: 'Adequate stock',
    newValue: 'Low stock warning (Coverage: 25.7%)',
    reason: "Metro General Hospital's O-positive red blood cell stock may be below the amount needed for expected demand. Estimated units needed for protection: 37.",
    displayTitle: 'Blood Stock May Be Low',
    displayCategory: 'Stock Warning',
    displayPerformer: 'Automated Stock Monitoring System',
    displayExplanation: "Metro General Hospital's O-positive red blood cell stock may be below the amount needed for expected demand.",
    displayNote: 'Estimated requirement: 37 units of O-positive red blood cells (O+)',
    isDemonstration: true,
  },
  {
    id: 'LOG_003',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    userId: 'SYS_OPTIMIZER',
    userName: 'Automated Delivery Planning System',
    userRole: 'ADMIN',
    action: 'RECOMMENDATION_CREATED',
    entityType: 'TRANSFER_RECOMMENDATION',
    entityId: 'REC_TRF_101',
    oldValue: 'No active proposal',
    newValue: 'Proposed: 6 units of O-positive red blood cells (O+) (Northern Blood Bank -> Metro General Hospital)',
    reason: 'Northern Blood Bank has an estimated 48 units available above its local protection requirement. This is a system recommendation. An authorized person must review and approve the request before any blood is moved.',
    recommendationId: 'REC_TRF_101',
    displayTitle: 'Blood Sharing Recommendation Created',
    displayCategory: 'Sharing Recommendation',
    displayPerformer: 'Automated Delivery Planning System',
    displayExplanation: 'Northern Blood Bank has an estimated 48 units available above its local protection requirement.',
    displayNote: 'This is a system recommendation. An authorized person must review and approve the request before any blood is moved.',
    isDemonstration: true,
  },
  {
    id: 'LOG_004',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    userId: 'USR_APPROVER_01',
    userName: 'Dr. Sarah Jenkins',
    userRole: 'AUTHORIZED_APPROVER',
    action: 'TRANSFER_APPROVED',
    entityType: 'TRANSFER',
    entityId: 'TR-101',
    oldValue: 'Waiting for approval',
    newValue: 'Approved for dispatch',
    reason: "The authorized reviewer checked the recipient's urgent blood requirement and the available blood at the sending location before approving the transfer.",
    recommendationId: 'REC_TRF_101',
    displayTitle: 'Blood Transfer Approved',
    displayCategory: 'Transfer Approval',
    displayPerformer: 'Dr. Sarah Jenkins — Authorized Approver',
    displayExplanation: "The authorized reviewer checked the recipient's urgent blood requirement and the available blood at the sending location before approving the transfer.",
    displayNote: 'Approved by Authorized Reviewer for cold-chain transport.',
    isDemonstration: true,
  },
];

export function logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  useAuditStore.getState().logAction(entry);
}

export const useAuditStore = create<AuditState>((set, get) => ({
  logs: INITIAL_AUDIT_LOGS,

  logAction: (entry) => {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `LOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };

    set(state => ({
      logs: [newEntry, ...state.logs],
    }));
  },

  getLogsByEntity: (entityId: string) => {
    return get().logs.filter(l => l.entityId === entityId || l.recommendationId === entityId);
  },

  clearLogs: () => set({ logs: [] }),
}));
