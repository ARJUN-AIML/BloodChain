import { useState } from 'react';
import {
  FileText, ShieldCheck, CheckCircle2, Lock, ArrowRight,
  Clock, Building2, UserCheck, AlertTriangle, ShieldAlert,
  PlusCircle, Truck, PackageCheck, X, AlertCircle, RefreshCw,
  Check, Eye
} from 'lucide-react';
import { cn, formatBloodGroup, COMPONENT_LABELS } from '@/lib/utils';
import { DEMO_ORGANIZATIONS, DEMO_INVENTORY } from '@/lib/demo-data';
import { useAuthStore } from '@/lib/auth-store';
import { useAuditStore } from '@/lib/audit-store';
import { useRequestsStore } from '@/lib/requests-store';
import { dispatchNotification } from '@/lib/brevo-notification';
import type { BloodGroup, ComponentType } from '@/types';

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
}

const INITIAL_REQUESTS: PlainTransferRequest[] = [
  {
    id: 'TR-TRY-8821',
    sourceFacilityId: 'SIM_HOSP_TRICHY_CENTRAL',
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
  },
  {
    id: 'TR-TRY-8822',
    sourceFacilityId: 'SIM_HOSP_TRICHY_CENTRAL',
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
  },
  {
    id: 'TR-TRY-8820',
    sourceFacilityId: 'SIM_HOSP_THUVAKUDI',
    sourceFacilityName: 'Thuvakudi Industrial Corridor Health Center (Simulated)',
    destinationFacilityId: 'SIM_HOSP_TRICHY_CENTRAL',
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
  },
];

export function RequestsPage() {
  const {
    requests,
    addRequest,
    approveRequest,
    rejectRequest,
    dispatchRequest,
    receiveRequest,
  } = useRequestsStore();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'TRANSIT' | 'COMPLETED'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequestForDetails, setSelectedRequestForDetails] = useState<PlainTransferRequest | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Request Form State
  const [newSourceId, setNewSourceId] = useState('SIM_HOSP_TRICHY_CENTRAL');
  const [newDestId, setNewDestId] = useState('SIM_HOSP_MANAPPARAI');
  const [newBg, setNewBg] = useState<BloodGroup>('O_NEGATIVE');
  const [newComp, setNewComp] = useState<ComponentType>('RBC');
  const [newQty, setNewQty] = useState<number>(2);
  const [newPriority, setNewPriority] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY'>('URGENT');
  const [newReason, setNewReason] = useState('');
  const {
    currentUser,
    canCreateTransfer,
    canApproveTransfer,
    canRejectTransfer,
    canStartTransport,
    canConfirmReceipt,
  } = useAuthStore();
  const hasApprovalRights = canApproveTransfer();

  const [rejectingReq, setRejectingReq] = useState<PlainTransferRequest | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const facilities = DEMO_ORGANIZATIONS.filter(o => o.type === 'HOSPITAL' || o.type === 'BLOOD_BANK');

  // Helper function to map internal status to user-friendly label
  const getPlainStatus = (status: PlainTransferRequest['status']) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return { label: 'Waiting for approval', style: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'APPROVED':
        return { label: 'Approved for dispatch', style: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'IN_TRANSIT':
        return { label: 'Being transported', style: 'bg-sky-50 text-sky-800 border-sky-200' };
      case 'RECEIVED':
        return { label: 'Received by destination', style: 'bg-stone-100 text-stone-800 border-stone-200' };
      case 'REJECTED':
        return { label: 'Request rejected', style: 'bg-red-50 text-red-800 border-red-200' };
      default:
        return { label: status, style: 'bg-stone-50 text-stone-700 border-stone-200' };
    }
  };

  // Workflow Handlers
  const handleApprove = (req: PlainTransferRequest) => {
    if (!hasApprovalRights) {
      setFeedbackMessage({
        type: 'error',
        text: `Role '${currentUser.role.replace('_', ' ')}' is not authorized to approve transfers. Authorized Approver sign-off required.`
      });
      return;
    }

    if (req.status !== 'PENDING_APPROVAL') {
      setFeedbackMessage({
        type: 'error',
        text: `Cannot approve transfer in status '${getPlainStatus(req.status).label}'. Must be 'Waiting for approval'.`
      });
      return;
    }

    approveRequest(req.id, currentUser.name, `Clinical authorization granted by ${currentUser.name}. ${req.reason}`);

    setFeedbackMessage({
      type: 'success',
      text: `Transfer ${req.id} successfully approved. Waiting for logistics dispatch.`
    });
  };

  const handleOpenRejectModal = (req: PlainTransferRequest) => {
    if (!canRejectTransfer()) {
      setFeedbackMessage({
        type: 'error',
        text: `Role '${currentUser.role.replace('_', ' ')}' is not authorized to reject transfers. Only Authorized Approvers hold clinical rejection authority.`
      });
      return;
    }
    setRejectingReq(req);
    setRejectionReasonInput('');
  };

  const handleConfirmReject = () => {
    if (!rejectingReq) return;
    const trimmed = rejectionReasonInput.trim();
    if (!trimmed) {
      setFeedbackMessage({
        type: 'error',
        text: 'A specific clinical or operational reason is required when rejecting a transfer request.'
      });
      return;
    }

    rejectRequest(rejectingReq.id, trimmed);

    setFeedbackMessage({
      type: 'success',
      text: `Transfer ${rejectingReq.id} has been rejected with documented reason.`
    });

    setRejectingReq(null);
    setRejectionReasonInput('');
  };

  const handleStartTransport = (req: PlainTransferRequest) => {
    if (!canStartTransport()) {
      setFeedbackMessage({
        type: 'error',
        text: `Role '${currentUser.role.replace('_', ' ')}' cannot start transport. Only Logistics Staff are authorized to initiate cold-chain dispatch.`
      });
      return;
    }

    if (req.status !== 'APPROVED') {
      setFeedbackMessage({
        type: 'error',
        text: `Cannot start transport. Transfer must be in 'Approved for dispatch' status.`
      });
      return;
    }

    dispatchRequest(req.id);

    setFeedbackMessage({
      type: 'success',
      text: `Transfer ${req.id} is now being transported. Units deducted from sending facility.`
    });
  };

  const handleConfirmReceipt = (req: PlainTransferRequest) => {
    if (!canConfirmReceipt()) {
      setFeedbackMessage({
        type: 'error',
        text: `Role '${currentUser.role.replace('_', ' ')}' is not authorized to confirm delivery. Hospital Staff delivery sign-off is restricted.`
      });
      return;
    }

    if (req.status !== 'IN_TRANSIT') {
      setFeedbackMessage({
        type: 'error',
        text: `Cannot confirm receipt. Transfer must be 'Being transported' before arrival.`
      });
      return;
    }

    receiveRequest(req.id);

    setFeedbackMessage({
      type: 'success',
      text: `Transfer ${req.id} marked as received. Units credited to receiving facility.`
    });
  };

  const handleCreateRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newSourceId === newDestId) {
      setFeedbackMessage({
        type: 'error',
        text: 'Sending and receiving facility cannot be the same.'
      });
      return;
    }

    if (newQty <= 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'Requested quantity must be at least 1 unit.'
      });
      return;
    }

    const sourceFacility = facilities.find(f => f.id === newSourceId);
    const destFacility = facilities.find(f => f.id === newDestId);

    const newReq: PlainTransferRequest = {
      id: `TR-TRY-${Math.floor(1000 + Math.random() * 9000)}`,
      sourceFacilityId: newSourceId,
      sourceFacilityName: sourceFacility?.name || 'Selected Facility',
      destinationFacilityId: newDestId,
      destinationFacilityName: destFacility?.name || 'Selected Facility',
      bloodGroup: newBg,
      componentType: newComp,
      quantity: newQty,
      availableToShare: 8,
      priority: newPriority,
      status: 'PENDING_APPROVAL',
      reason: newReason || 'Clinical demand requirement.',
      requestedBy: `${currentUser.name} (${currentUser.role.replace('_', ' ')})`,
    };

    addRequest(newReq);
    setShowCreateModal(false);
    setNewReason('');

    setFeedbackMessage({
      type: 'success',
      text: `Transfer request ${newReq.id} created successfully. It is now waiting for clinical approval.`
    });
  };

  // Tab Filtering
  const filteredRequests = requests.filter(r => {
    if (activeTab === 'PENDING') return r.status === 'PENDING_APPROVAL';
    if (activeTab === 'TRANSIT') return r.status === 'IN_TRANSIT' || r.status === 'APPROVED';
    if (activeTab === 'COMPLETED') return r.status === 'RECEIVED' || r.status === 'REJECTED';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#841A2B]">
              Inter-Facility Coordination
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-stone-500 font-medium">Human Oversight Enforced</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Transfer Requests & Approvals
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Review and coordinate blood transfers between facilities. Authorized clinical approval is required before dispatch.
          </p>
        </div>

        {/* Primary User Action: Request Blood */}
        <div className="flex items-center gap-3">
          {canCreateTransfer() ? (
            <button
              type="button"
              onClick={() => {
                if (currentUser.organizationId && facilities.some(f => f.id === currentUser.organizationId)) {
                  setNewDestId(currentUser.organizationId);
                }
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#841A2B] hover:bg-[#701524] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Request Blood
            </button>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-400 text-xs font-medium border border-stone-200 cursor-not-allowed"
              title="Only Hospital Staff and Blood Bank Staff can request blood transfers."
            >
              <Lock className="w-3.5 h-3.5" /> Request Blood (Requester Role Required)
            </span>
          )}
        </div>
      </div>

      {/* 2. Role Capability Banner */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#841A2B] text-white flex items-center justify-center font-bold text-xs">
            {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-900">{currentUser.name}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                {currentUser.role.replace('_', ' ')}
              </span>
            </div>
            <p className="text-stone-500 text-[11px] mt-0.5">
              {hasApprovalRights
                ? '✓ You have clinical authority to approve or reject blood transfers with mandatory reasoning.'
                : currentUser.role === 'LOGISTICS_STAFF'
                ? '✓ You can initiate cold-chain departure for approved transfers and confirm courier delivery.'
                : currentUser.role === 'HOSPITAL_STAFF'
                ? '✓ You can request blood units and track facility requests. Clinical approvals and delivery sign-offs require designated roles.'
                : currentUser.role === 'BLOOD_BANK_STAFF'
                ? '✓ You can request hub rebalancing transfers and verify intake receipts.'
                : '• Administrative oversight mode. Clinical approval rules cannot be bypassed.'}
            </p>
          </div>
        </div>

        <div className="text-[11px] text-stone-500 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200/80">
          <strong>Security invariant:</strong> Transfers cannot be dispatched without prior clinical approval.
        </div>
      </div>

      {/* Feedback Toast Notification */}
      {feedbackMessage && (
        <div className={cn(
          'p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-2xs transition-all',
          feedbackMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-red-50 border-red-200 text-red-900'
        )}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-stone-400 hover:text-stone-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={cn(
            'px-3 py-1.5 rounded-lg transition-colors',
            activeTab === 'ALL' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
          )}
        >
          All Requests ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PENDING')}
          className={cn(
            'px-3 py-1.5 rounded-lg transition-colors',
            activeTab === 'PENDING' ? 'bg-[#841A2B] text-white' : 'text-stone-600 hover:bg-stone-100'
          )}
        >
          Waiting for Approval ({requests.filter(r => r.status === 'PENDING_APPROVAL').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('TRANSIT')}
          className={cn(
            'px-3 py-1.5 rounded-lg transition-colors',
            activeTab === 'TRANSIT' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
          )}
        >
          In Transit / Approved ({requests.filter(r => r.status === 'IN_TRANSIT' || r.status === 'APPROVED').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('COMPLETED')}
          className={cn(
            'px-3 py-1.5 rounded-lg transition-colors',
            activeTab === 'COMPLETED' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
          )}
        >
          Completed ({requests.filter(r => r.status === 'RECEIVED' || r.status === 'REJECTED').length})
        </button>
      </div>

      {/* 4. Requests Cards List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center space-y-2">
            <FileText className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="font-semibold text-stone-800 text-sm">No transfer requests in this view</p>
            <p className="text-xs text-stone-500">Select another filter tab or create a new request.</p>
          </div>
        ) : (
          filteredRequests.map(req => {
            const statusInfo = getPlainStatus(req.status);

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs hover:border-stone-300 transition-all space-y-4"
              >
                {/* Top Manifest Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                      {req.id}
                    </span>
                    <span className={cn(
                      'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border',
                      req.priority === 'EMERGENCY' ? 'bg-red-50 text-red-700 border-red-200' :
                      req.priority === 'URGENT' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-stone-100 text-stone-600 border-stone-200'
                    )}>
                      {req.priority} Priority
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full border', statusInfo.style)}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Facility Movement Row */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-5 space-y-1">
                    <span className="text-[10px] text-stone-400 uppercase font-semibold block">Sending Facility</span>
                    <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-stone-400" />
                      {req.sourceFacilityName}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Available to share: <span className="font-semibold text-stone-700 font-mono">{req.availableToShare} units</span>
                    </p>
                  </div>

                  <div className="md:col-span-2 flex justify-center">
                    <div className="p-2 rounded-full bg-stone-50 border border-stone-200 text-stone-400 hidden md:block">
                      <ArrowRight className="w-4 h-4 text-[#841A2B]" />
                    </div>
                  </div>

                  <div className="md:col-span-5 space-y-1">
                    <span className="text-[10px] text-stone-400 uppercase font-semibold block">Receiving Facility</span>
                    <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-stone-400" />
                      {req.destinationFacilityName}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Requested by: <span className="text-stone-700 font-medium">{req.requestedBy}</span>
                    </p>
                  </div>
                </div>

                {/* Product & Quantity Box */}
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-stone-500 text-[10px] uppercase font-medium">Blood Product</span>
                      <p className="font-bold text-stone-900">
                        {formatBloodGroup(req.bloodGroup)} • {COMPONENT_LABELS[req.componentType]}
                      </p>
                    </div>
                    <div className="border-l border-stone-200 pl-4">
                      <span className="text-stone-500 text-[10px] uppercase font-medium">Quantity</span>
                      <p className="font-bold text-[#841A2B] font-mono text-sm">
                        {req.quantity} units
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-600 max-w-md italic">
                    "{req.reason}"
                  </p>
                </div>

                {/* Workflow Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
                  <div className="text-[11px] text-stone-400">
                    {req.approvedBy && (
                      <span>Approved by: <strong className="text-stone-700">{req.approvedBy}</strong> {req.approvedAt && `(${req.approvedAt})`}</span>
                    )}
                    {req.dispatchedAt && (
                      <span className="ml-2">• Dispatched: <strong className="text-stone-700">{req.dispatchedAt}</strong></span>
                    )}
                    {req.receivedAt && (
                      <span className="ml-2">• Received: <strong className="text-stone-700">{req.receivedAt}</strong></span>
                    )}
                  </div>

                  {/* Contextual Action Buttons based on Role & Status */}
                  <div className="flex items-center gap-2">
                    {/* Action: Approve / Reject (Only for Pending and Approver) */}
                    {req.status === 'PENDING_APPROVAL' && (
                      canApproveTransfer() ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenRejectModal(req)}
                            className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-stone-700 text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject Request
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(req)}
                            className="px-3 py-1.5 rounded-lg bg-[#841A2B] hover:bg-[#701524] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve Transfer
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-stone-400 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200 font-medium">
                          Awaiting Authorized Approver sign-off
                        </span>
                      )
                    )}

                    {/* Action: Start Transport (For Approved status) */}
                    {req.status === 'APPROVED' && (
                      canStartTransport() ? (
                        <button
                          type="button"
                          onClick={() => handleStartTransport(req)}
                          className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Start Transport
                        </button>
                      ) : (
                        <span className="text-[11px] text-stone-400 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200 font-medium">
                          Approved • Waiting for logistics courier dispatch
                        </span>
                      )
                    )}

                    {/* Action: Confirm Receipt (For In Transit status) */}
                    {req.status === 'IN_TRANSIT' && (
                      canConfirmReceipt() ? (
                        <button
                          type="button"
                          onClick={() => handleConfirmReceipt(req)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          Confirm Receipt
                        </button>
                      ) : (
                        <span className="text-[11px] text-stone-400 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200 font-medium">
                          In transit to destination (Hospital staff delivery sign-off restricted)
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Create Transfer Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-serif font-bold text-stone-900">
                  Request Blood Transfer
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Order units from regional partner facilities with human clinical approval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequestSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">Sending Facility (Source)</label>
                  <select
                    value={newSourceId}
                    onChange={e => setNewSourceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white text-xs text-stone-900"
                  >
                    {facilities.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">Receiving Facility (Destination)</label>
                  <select
                    value={newDestId}
                    onChange={e => setNewDestId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white text-xs text-stone-900"
                  >
                    {facilities.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">Blood Group</label>
                  <select
                    value={newBg}
                    onChange={e => setNewBg(e.target.value as BloodGroup)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white text-xs text-stone-900"
                  >
                    {['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'].map(b => (
                      <option key={b} value={b}>{formatBloodGroup(b as BloodGroup)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">Component</label>
                  <select
                    value={newComp}
                    onChange={e => setNewComp(e.target.value as ComponentType)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white text-xs text-stone-900"
                  >
                    {['RBC', 'PLASMA', 'PLATELETS', 'WHOLE_BLOOD'].map(c => (
                      <option key={c} value={c}>{COMPONENT_LABELS[c as ComponentType]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">Quantity (Units)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newQty}
                    onChange={e => setNewQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white text-xs text-stone-900 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">Priority Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ROUTINE', 'URGENT', 'EMERGENCY'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={cn(
                        'py-1.5 rounded-lg border text-xs font-semibold capitalize transition-colors',
                        newPriority === p
                          ? 'bg-[#841A2B] text-white border-[#841A2B]'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      )}
                    >
                      {p.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">Clinical Reason / Diagnosis</label>
                <textarea
                  rows={2}
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                  placeholder="e.g. Acute surgical blood loss, trauma resuscitation, or maternity care requirement..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white text-xs text-stone-900"
                  required
                />
              </div>

              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-500">
                Notice: Creating this request will set it to <strong>"Waiting for approval"</strong>. An Authorized Approver must sign off before physical dispatch.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#841A2B] hover:bg-[#701524] text-white font-semibold"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Mandatory Rejection Reason Modal */}
      {rejectingReq && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between pb-2 border-b border-stone-100">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Mandatory Rejection Reason</h3>
                <p className="text-xs text-stone-500">Provide clinical justification for rejecting transfer {rejectingReq.id}.</p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingReq(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label htmlFor="modal-rejection-reason" className="block text-xs font-semibold text-stone-700">
                Reason for Rejection <span className="text-red-600">*</span>
              </label>
              <textarea
                id="modal-rejection-reason"
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g., Local inventory priority required for active surgery; alternate supply recommended..."
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:border-[#841A2B] focus:ring-1 focus:ring-[#841A2B] outline-none"
                autoFocus
              />
              <p className="text-[10px] text-stone-400">Clinical justification is mandatory and permanently logged in the audit trail.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRejectingReq(null)}
                className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={!rejectionReasonInput.trim()}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors',
                  rejectionReasonInput.trim()
                    ? 'bg-red-700 hover:bg-red-800'
                    : 'bg-stone-300 cursor-not-allowed'
                )}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
