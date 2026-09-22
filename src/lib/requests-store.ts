import { create } from 'zustand';
import type { BloodGroup, ComponentType } from '@/types';
import { logAuditEvent } from './audit-store';
import { dispatchNotification } from './brevo-notification';

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
    sourceFacilityName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    destinationFacilityId: 'SIM_HOSP_MANAPPARAI',
    destinationFacilityName: 'Manapparai Highway Trauma Unit (Simulated)',
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
    sourceFacilityName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    destinationFacilityId: 'SIM_HOSP_SRIRANGAM',
    destinationFacilityName: 'Srirangam Sub-Divisional Hospital (Simulated)',
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
    sourceFacilityName: 'Thuvakudi Industrial Corridor Health Center (Simulated)',
    destinationFacilityId: 'SIM_BB_TRY_CENTRAL',
    destinationFacilityName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
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
    sourceFacilityName: 'Lalgudi Taluk Care Unit (Simulated)',
    destinationFacilityId: 'SIM_HOSP_MANACHANALLUR',
    destinationFacilityName: 'Manachanallur Rural Health Center (Simulated)',
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
  addRequest: (req: PlainTransferRequest) => void;
  approveRequest: (id: string, approverName: string, reason?: string) => void;
  rejectRequest: (id: string, reason: string) => void;
  dispatchRequest: (id: string) => void;
  receiveRequest: (id: string) => void;
  setActiveLiveDemoRequestId: (id: string | null) => void;
  resetToInitial: () => void;
}

export const useRequestsStore = create<RequestsStoreState>((set, get) => ({
  requests: INITIAL_REQUESTS,
  activeLiveDemoRequestId: 'TR-TRY-8821',

  addRequest: (newReq) => {
    const hash = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const reqWithHash = {
      ...newReq,
      blockchainHash: hash,
      aiMatchScore: newReq.aiMatchScore || Math.floor(92 + Math.random() * 7.5 * 10) / 10,
    };

    set(state => ({
      requests: [reqWithHash, ...state.requests],
      activeLiveDemoRequestId: reqWithHash.id,
    }));

    logAuditEvent({
      userId: 'LIVE_DEMO_USER',
      userName: reqWithHash.requestedBy,
      userRole: 'HOSPITAL_STAFF',
      action: 'TRANSFER_REQUEST_CREATED',
      entityType: 'TRANSFER_REQUEST',
      entityId: reqWithHash.id,
      oldValue: 'None',
      newValue: 'PENDING_APPROVAL',
      reason: `Live Blood Request Created: ${reqWithHash.quantity} units ${reqWithHash.bloodGroup} for ${reqWithHash.destinationFacilityName}. Reason: ${reqWithHash.reason}`,
    });

    dispatchNotification({
      event: 'TRANSFER_REQUEST_CREATED',
      scenarioName: 'Manual Live Demo Request',
      transferId: reqWithHash.id,
      sourceFacility: reqWithHash.sourceFacilityName,
      destinationFacility: reqWithHash.destinationFacilityName,
      bloodGroup: reqWithHash.bloodGroup,
      componentType: reqWithHash.componentType,
      units: reqWithHash.quantity,
    });
  },

  approveRequest: (id, approverName, reason) => {
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
        scenarioName: 'Manual Live Demo Approval',
        transferId: targetReq.id,
        sourceFacility: targetReq.sourceFacilityName,
        destinationFacility: targetReq.destinationFacilityName,
        bloodGroup: targetReq.bloodGroup,
        componentType: targetReq.componentType,
        units: targetReq.quantity,
      });
    }
  },

  rejectRequest: (id, reason) => {
    set(state => ({
      requests: state.requests.map(r => r.id === id ? { ...r, status: 'REJECTED', reason: `Rejected: ${reason}` } : r),
    }));

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

  dispatchRequest: (id) => {
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
        scenarioName: 'Manual Live Demo Cold-Chain Dispatch',
        transferId: id,
        sourceFacility: targetReq.sourceFacilityName,
        destinationFacility: targetReq.destinationFacilityName,
        bloodGroup: targetReq.bloodGroup,
        componentType: targetReq.componentType,
        units: targetReq.quantity,
      });
    }
  },

  receiveRequest: (id) => {
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
        scenarioName: 'Manual Live Demo Receipt & Inventory Sync',
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
