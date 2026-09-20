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
    userName: 'XGBoost Forecasting Engine',
    userRole: 'ADMIN',
    action: 'PREDICTION_GENERATED',
    entityType: 'FORECAST',
    entityId: 'HOSP_A_O_POS_RBC',
    oldValue: 'P50: 22.0',
    newValue: 'P50: 24.2 (P90: 29.7)',
    reason: 'Routine 72-hour demand forecast cycle completed.',
  },
  {
    id: 'LOG_002',
    timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
    userId: 'SYS_SHORTAGE_ENGINE',
    userName: 'Uncertainty Risk Engine',
    userRole: 'ADMIN',
    action: 'SHORTAGE_FLAGGED',
    entityType: 'SHORTAGE_RISK',
    entityId: 'SHORT_01',
    oldValue: 'NORMAL',
    newValue: 'CRITICAL (Coverage: 25.7%)',
    reason: 'Metro General Hospital O+ RBC inventory fell below P90 protection level (37 units required).',
  },
  {
    id: 'LOG_003',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    userId: 'SYS_OPTIMIZER',
    userName: 'OR-Tools Allocation Solver',
    userRole: 'ADMIN',
    action: 'RECOMMENDATION_CREATED',
    entityType: 'TRANSFER_RECOMMENDATION',
    entityId: 'REC_TRF_101',
    oldValue: 'NONE',
    newValue: 'PROPOSED: 6 Units O+ RBC (Northern Blood Bank -> Metro General)',
    reason: 'Northern Blood Bank has 48 safe-to-share units above local P90 protection level.',
    recommendationId: 'REC_TRF_101',
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
    oldValue: 'PENDING_APPROVAL',
    newValue: 'APPROVED / IN_TRANSIT',
    reason: 'Verified recipient critical deficit and confirmed donor safe-to-share margin.',
    recommendationId: 'REC_TRF_101',
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
