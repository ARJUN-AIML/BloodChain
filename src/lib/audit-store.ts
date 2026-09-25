import { create } from 'zustand';
import type { AuditLogEntry, UserRole } from '@/types';
import { apiClient } from './api-client';

interface AuditState {
  logs: AuditLogEntry[];
  fetchAuditLogsFromBackend: () => Promise<void>;
  logAction: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  getLogsByEntity: (entityId: string) => AuditLogEntry[];
  clearLogs: () => void;
}

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'LOG_001',
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    userId: 'SYS_ML_ENGINE',
    userName: 'XGBoost Demand Inference Service',
    userRole: 'ADMIN',
    action: 'PREDICTION_GENERATED',
    entityType: 'FORECAST',
    entityId: 'HOSP_A_O_POS_RBC',
    oldValue: 'Baseline requirement: 22 units',
    newValue: 'Inferred 72h requirement: 24 units (P50)',
    reason: 'Automated 72-hour machine learning demand forecast generated using regional historical time series.',
    displayTitle: 'Demand Forecast Model Inference',
    displayCategory: 'ML Inference',
    displayPerformer: 'XGBoost Demand Inference Service',
    displayExplanation: 'Automated 72-hour machine learning demand forecast generated using regional historical time series.',
    displayNote: 'System model inference generated with 88% confidence score.',
  },
  {
    id: 'LOG_002',
    timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
    userId: 'SYS_SHORTAGE_ENGINE',
    userName: 'Inventory Monitoring Pipeline',
    userRole: 'ADMIN',
    action: 'SHORTAGE_FLAGGED',
    entityType: 'SHORTAGE_RISK',
    entityId: 'SHORT_01',
    oldValue: 'Adequate stock',
    newValue: 'Critical shortage warning (Coverage: 0.0%)',
    reason: 'Manapparai Highway Trauma Unit O-Negative red blood cell inventory dropped below minimum safety buffer following emergency intake.',
    displayTitle: 'Critical Inventory Deficit Alert',
    displayCategory: 'Inventory Alert',
    displayPerformer: 'Inventory Monitoring Pipeline',
    displayExplanation: 'Manapparai Highway Trauma Unit O-Negative red blood cell inventory dropped below minimum safety buffer.',
    displayNote: 'Required stock: 6 units O-Negative PRBC.',
  },
  {
    id: 'LOG_003',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    userId: 'SYS_OPTIMIZER',
    userName: 'Optimization Solver Module',
    userRole: 'ADMIN',
    action: 'RECOMMENDATION_CREATED',
    entityType: 'TRANSFER_RECOMMENDATION',
    entityId: 'REC_TRF_101',
    oldValue: 'No active proposal',
    newValue: 'Proposed: 6 units O-Negative PRBC (Central Blood Bank -> Manapparai Trauma)',
    reason: 'Central Hub verified to hold 8 units safe-to-share O-Negative PRBC above local buffer. Multi-criteria solver recommends 48 min highway transit.',
    recommendationId: 'REC_TRF_101',
    displayTitle: 'Multi-Criteria Allocation Optimization',
    displayCategory: 'Allocation Solver',
    displayPerformer: 'Optimization Solver Module',
    displayExplanation: 'Central Hub verified to hold 8 units safe-to-share O-Negative PRBC above local buffer.',
    displayNote: 'Optimal candidate identified: 48 min transit time via NH 83 corridor.',
  },
  {
    id: 'LOG_004',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    userId: 'USR_APPROVER_01',
    userName: 'Dr. Sarah Jenkins',
    userRole: 'AUTHORIZED_APPROVER',
    action: 'TRANSFER_APPROVED',
    entityType: 'TRANSFER',
    entityId: 'TR-TRY-8821',
    oldValue: 'PENDING_APPROVAL',
    newValue: 'APPROVED',
    reason: 'Clinical authorization granted after verifying recipient urgency and source safe-to-share surplus.',
    recommendationId: 'REC_TRF_101',
    displayTitle: 'Clinical Transfer Authorization',
    displayCategory: 'Transfer Approval',
    displayPerformer: 'Dr. Sarah Jenkins (Authorized Approver)',
    displayExplanation: 'Clinical authorization granted after verifying recipient urgency and source safe-to-share surplus.',
    displayNote: 'Authorized for immediate cold-chain dispatch.',
  },
];

export function logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  useAuditStore.getState().logAction(entry);
}

export const useAuditStore = create<AuditState>((set, get) => ({
  logs: INITIAL_AUDIT_LOGS,

  fetchAuditLogsFromBackend: async () => {
    try {
      const data = await apiClient.getAuditLogs();
      if (Array.isArray(data) && data.length > 0) {
        const mapped: AuditLogEntry[] = data.map((item: any) => ({
          id: String(item.id),
          timestamp: item.timestamp,
          userId: item.user || 'SYS',
          userName: item.user_name || 'System User',
          userRole: (item.user_role as UserRole) || 'ADMIN',
          action: item.action,
          entityType: item.entity_type,
          entityId: item.entity_id,
          oldValue: item.old_value || '',
          newValue: item.new_value || '',
          reason: item.reason || item.notes || '',
          displayTitle: item.action ? item.action.replace(/_/g, ' ') : 'System Audit Event',
          displayCategory: item.entity_type || 'System Audit',
          displayPerformer: item.user_name || 'System User',
          displayExplanation: item.reason || 'Database audit event recorded.',
        }));
        set({ logs: mapped });
      }
    } catch (e) {
      console.warn('Audit logs backend sync notice:', e);
    }
  },

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

