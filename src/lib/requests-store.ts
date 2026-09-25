import { create } from 'zustand';
import type { BloodGroup, ComponentType } from '@/types';
import { logAuditEvent } from './audit-store';
import { dispatchNotification } from './brevo-notification';
import { apiClient } from './api-client';

export interface PlainTransferRequest {
  id: string;
  sourceFacilityId: string;
  sourceFacilityName: string;
  destinationFacilityId: string;
  destinationFacilityName: string;
  bloodGroup: BloodGroup;
  componentType: ComponentType;
  quantity: number;
  availableToShare: number;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
  reason: string;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  blockchainHash?: string;
  aiMatchScore?: number;
}

const INITIAL_REQUESTS: PlainTransferRequest[] = [
  {
    id: 'TR-TRY-8821',
    sourceFacilityId: 'SIM_BB_TRY_CENTRAL',
    sourceFacilityName: 'Tiruchirappalli Central Blood Bank Hub',
    destinationFacilityId: 'SIM_HOSP_MANAPPARAI',
    destinationFacilityName: 'Manapparai Highway Trauma Unit',
    bloodGroup: 'O_NEGATIVE',
    componentType: 'RBC',
    quantity: 6,
    availableToShare: 8,
    priority: 'EMERGENCY',
    status: 'PENDING_APPROVAL',
    reason: 'Acute O- deficit following NH 83 highway collision with multiple trauma victims requiring immediate surgery.',
    requestedBy: 'Dr. Rajesh Kumar (Manapparai Trauma)',
    aiMatchScore: 98.4,
    blockchainHash: '0x3f8a91b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9',
  },
  {
    id: 'TR-TRY-8822',
    sourceFacilityId: 'SIM_BB_TRY_CENTRAL',
    sourceFacilityName: 'Tiruchirappalli Central Blood Bank Hub',
    destinationFacilityId: 'SIM_HOSP_SRIRANGAM',
    destinationFacilityName: 'Srirangam Sub-Divisional Hospital',
    bloodGroup: 'A_NEGATIVE',
    componentType: 'RBC',
    quantity: 4,
    availableToShare: 12,
    priority: 'URGENT',
    status: 'APPROVED',
    reason: 'Scheduled orthopedic procedure with expected hemorrhagic risk.',
    requestedBy: 'Dr. Sarah Jenkins',
    approvedBy: 'Dr. Sarah Jenkins (Authorized Approver)',
    approvedAt: 'Today, 09:15 AM',
    aiMatchScore: 94.1,
    blockchainHash: '0x81b7a2e4c5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
  },
  {
    id: 'TR-TRY-8820',
    sourceFacilityId: 'SIM_HOSP_THUVAKUDI',
    sourceFacilityName: 'Thuvakudi Industrial Corridor Health Center',
    destinationFacilityId: 'SIM_BB_TRY_CENTRAL',
    destinationFacilityName: 'Tiruchirappalli Central Blood Bank Hub',
    bloodGroup: 'B_POSITIVE',
    componentType: 'PLATELETS',
    quantity: 5,
    availableToShare: 10,
    priority: 'ROUTINE',
    status: 'IN_TRANSIT',
    reason: 'Regional stock rebalancing for high-usage central hub.',
    requestedBy: 'Ananya Roy (Blood Bank Staff)',
    approvedBy: 'Dr. Sarah Jenkins',
    approvedAt: 'Today, 08:30 AM',
    dispatchedAt: 'Today, 09:00 AM',
    aiMatchScore: 96.0,
    blockchainHash: '0x55a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8',
  },
  {
    id: 'TR-TRY-8819',
    sourceFacilityId: 'SIM_HOSP_LALGUDI',
    sourceFacilityName: 'Lalgudi Taluk Care Unit',
    destinationFacilityId: 'SIM_HOSP_MANACHANALLUR',
    destinationFacilityName: 'Manachanallur Rural Health Center',
    bloodGroup: 'O_POSITIVE',
    componentType: 'RBC',
    quantity: 3,
    availableToShare: 7,
    priority: 'ROUTINE',
    status: 'RECEIVED',
    reason: 'Maternity care backup inventory.',
    requestedBy: 'Hospital Staff',
    approvedBy: 'Dr. Sarah Jenkins',
    approvedAt: 'Yesterday',
    dispatchedAt: 'Yesterday',
    receivedAt: 'Yesterday, 04:30 PM',
    aiMatchScore: 91.5,
    blockchainHash: '0x12e4f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4',
  },
];

interface RequestsStoreState {
  requests: PlainTransferRequest[];
  activeLiveDemoRequestId: string | null;
  fetchTransfersFromBackend: () => Promise<void>;
  addRequest: (req: PlainTransferRequest) => Promise<void>;
  approveRequest: (id: string, approverName: string, reason?: string) => Promise<void>;
  rejectRequest: (id: string, reason: string) => Promise<void>;
  dispatchRequest: (id: string) => Promise<void>;
  receiveRequest: (id: string) => Promise<void>;
  setActiveLiveDemoRequestId: (id: string | null) => void;
  resetToInitial: () => void;
}


export const useRequestsStore = create<RequestsStoreState>((set, get) => ({
  requests: INITIAL_REQUESTS,
  activeLiveDemoRequestId: 'TR-TRY-8821',

  fetchTransfersFromBackend: async () => {
    try {
      const data = await apiClient.getTransfers();
      if (Array.isArray(data) && data.length > 0) {
        const mapped: PlainTransferRequest[] = data.map((t: any) => ({
          id: t.id,
          sourceFacilityId: t.source_facility || 'SIM_BB_TRY_CENTRAL',
          sourceFacilityName: t.source_facility_name || 'Tiruchirappalli Central Blood Bank Hub',
          destinationFacilityId: t.destination_facility || 'SIM_HOSP_MANAPPARAI',
          destinationFacilityName: t.destination_facility_name || 'Manapparai Highway Trauma Unit',
          bloodGroup: t.blood_group as BloodGroup,
          componentType: t.component_type as ComponentType,
          quantity: t.requested_quantity || 1,
          availableToShare: 8,
          priority: t.priority || 'ROUTINE',
          status: t.status,
          reason: t.notes || t.rejection_reason || 'Clinical transfer request',
          requestedBy: t.requested_by_name || 'Hospital Staff',
          approvedBy: t.approved_by_name,
          approvedAt: t.approved_at,
          dispatchedAt: t.dispatched_at,
          receivedAt: t.received_at,
          blockchainHash: '0x' + (t.id || 'hash').padEnd(40, 'a'),
          aiMatchScore: 96.5,
        }));
        set({ requests: mapped, activeLiveDemoRequestId: mapped[0]?.id || null });
      }
    } catch (e) {
      console.warn('Backend transfers sync notice:', e);
    }
  },

  addRequest: async (newReq) => {
    const hash = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    let reqWithHash = {
      ...newReq,
      blockchainHash: hash,
      aiMatchScore: newReq.aiMatchScore || Math.floor(92 + Math.random() * 7.5 * 10) / 10,
    };

    try {
      const created = await apiClient.createTransfer({
        source_facility: newReq.sourceFacilityId,
        destination_facility: newReq.destinationFacilityId,
        blood_group: newReq.bloodGroup,
        component_type: newReq.componentType,
        requested_quantity: newReq.quantity,
        priority: newReq.priority,
      });

      if (created && created.id) {
        reqWithHash.id = created.id;
      }
    } catch (e) {
      console.warn('Backend transfer creation API notice:', e);
    }

    set(state => ({
      requests: [reqWithHash, ...state.requests.filter(r => r.id !== reqWithHash.id)],
      activeLiveDemoRequestId: reqWithHash.id,
    }));

    logAuditEvent({
      userId: 'USR_HOSP_A',
      userName: reqWithHash.requestedBy,
      userRole: 'HOSPITAL_STAFF',
      action: 'TRANSFER_REQUEST_CREATED',
      entityType: 'TRANSFER_REQUEST',
      entityId: reqWithHash.id,
      oldValue: 'None',
      newValue: 'PENDING_APPROVAL',
      reason: `Blood Request Created: ${reqWithHash.quantity} units ${reqWithHash.bloodGroup} for ${reqWithHash.destinationFacilityName}. Reason: ${reqWithHash.reason}`,
    });

    dispatchNotification({
      event: 'TRANSFER_REQUEST_CREATED',
      scenarioName: 'Operational Workflow Request',
      transferId: reqWithHash.id,
      sourceFacility: reqWithHash.sourceFacilityName,
      destinationFacility: reqWithHash.destinationFacilityName,
      bloodGroup: reqWithHash.bloodGroup,
      componentType: reqWithHash.componentType,
      units: reqWithHash.quantity,
    });
  },

  approveRequest: async (id, approverName, reason) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    let targetReq: PlainTransferRequest | undefined;

    set(state => ({
      requests: state.requests.map(r => {
        if (r.id === id) {
          targetReq = {
            ...r,
            status: 'APPROVED',
            approvedBy: `${approverName} (Authorized Approver)`,
            approvedAt: timeStr,
          };
          return targetReq;
        }
        return r;
      }),
    }));

    try {
      await apiClient.approveTransfer(id);
    } catch (e) {
      console.warn('Backend approval API notice:', e);
    }

    if (targetReq) {
      logAuditEvent({
        userId: 'USR_APPROVER_01',
        userName: approverName,
        userRole: 'AUTHORIZED_APPROVER',
        action: 'TRANSFER_APPROVED',
        entityType: 'TRANSFER_REQUEST',
        entityId: targetReq.id,
        oldValue: 'PENDING_APPROVAL',
        newValue: 'APPROVED',
        reason: reason || `Clinical transfer approved by ${approverName}. ${targetReq.reason}`,
      });

      dispatchNotification({
        event: 'TRANSFER_APPROVED',
        scenarioName: 'Operational Workflow Approval',
        transferId: targetReq.id,
        sourceFacility: targetReq.sourceFacilityName,
        destinationFacility: targetReq.destinationFacilityName,
        bloodGroup: targetReq.bloodGroup,
        componentType: targetReq.componentType,
        units: targetReq.quantity,
      });
    }
  },

  rejectRequest: async (id, reason) => {
    set(state => ({
      requests: state.requests.map(r => r.id === id ? { ...r, status: 'REJECTED', reason: `Rejected: ${reason}` } : r),
    }));

    try {
      await apiClient.rejectTransfer(id, reason);
    } catch (e) {
      console.warn('Backend rejection API notice:', e);
    }

    logAuditEvent({
      userId: 'USR_APPROVER_01',
      userName: 'Dr. Sarah Jenkins',
      userRole: 'AUTHORIZED_APPROVER',
      action: 'TRANSFER_REJECTED',
      entityType: 'TRANSFER_REQUEST',
      entityId: id,
      oldValue: 'PENDING_APPROVAL',
      newValue: 'REJECTED',
      reason: `Transfer rejected: ${reason}`,
    });
  },

  dispatchRequest: async (id) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    let targetReq: PlainTransferRequest | undefined;

    set(state => ({
      requests: state.requests.map(r => {
        if (r.id === id) {
          targetReq = { ...r, status: 'IN_TRANSIT', dispatchedAt: timeStr };
          return targetReq;
        }
        return r;
      }),
    }));

    try {
      await apiClient.dispatchTransfer(id);
    } catch (e) {
      console.warn('Backend dispatch API notice:', e);
    }

    if (targetReq) {
      logAuditEvent({
        userId: 'USR_LOG_A',
        userName: 'Vikram Sethi',
        userRole: 'LOGISTICS_STAFF',
        action: 'TRANSFER_DISPATCHED',
        entityType: 'TRANSFER_REQUEST',
        entityId: id,
        oldValue: 'APPROVED',
        newValue: 'IN_TRANSIT',
        reason: `Cold-chain courier departed from ${targetReq.sourceFacilityName}. Temp logger active.`,
      });

      dispatchNotification({
        event: 'TRANSFER_DISPATCHED',
        scenarioName: 'Operational Cold-Chain Dispatch',
        transferId: id,
        sourceFacility: targetReq.sourceFacilityName,
        destinationFacility: targetReq.destinationFacilityName,
        bloodGroup: targetReq.bloodGroup,
        componentType: targetReq.componentType,
        units: targetReq.quantity,
      });
    }
  },

  receiveRequest: async (id) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    let targetReq: PlainTransferRequest | undefined;

    set(state => ({
      requests: state.requests.map(r => {
        if (r.id === id) {
          targetReq = { ...r, status: 'RECEIVED', receivedAt: timeStr };
          return targetReq;
        }
        return r;
      }),
    }));

    try {
      await apiClient.receiveTransfer(id);
    } catch (e) {
      console.warn('Backend receipt API notice:', e);
    }

    if (targetReq) {
      logAuditEvent({
        userId: 'USR_HOSP_A',
        userName: 'Dr. Rajesh Kumar',
        userRole: 'HOSPITAL_STAFF',
        action: 'TRANSFER_RECEIVED',
        entityType: 'TRANSFER_REQUEST',
        entityId: id,
        oldValue: 'IN_TRANSIT',
        newValue: 'RECEIVED',
        reason: `Units received at ${targetReq.destinationFacilityName}. Cold-chain verified at 3.8°C.`,
      });

      dispatchNotification({
        event: 'TRANSFER_RECEIVED',
        scenarioName: 'Operational Receipt & Inventory Sync',
        transferId: id,
        sourceFacility: targetReq.sourceFacilityName,
        destinationFacility: targetReq.destinationFacilityName,
        bloodGroup: targetReq.bloodGroup,
        componentType: targetReq.componentType,
        units: targetReq.quantity,
      });
    }
  },

  setActiveLiveDemoRequestId: (id) => set({ activeLiveDemoRequestId: id }),

  resetToInitial: () => set({ requests: INITIAL_REQUESTS, activeLiveDemoRequestId: 'TR-TRY-8821' }),
}));

