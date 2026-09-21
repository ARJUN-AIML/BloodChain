import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, ShieldCheck, CheckCircle2, AlertTriangle,
  ArrowRight, Check, X, Building2, TrendingUp, Clock, AlertCircle
} from 'lucide-react';
import { cn, formatBloodGroup, COMPONENT_LABELS } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { useAuditStore } from '@/lib/audit-store';
import { dispatchNotification } from '@/lib/brevo-notification';
import { DEMO_SHORTAGES, DEMO_SAFE_SHARE } from '@/lib/demo-data';
import type { BloodGroup, ComponentType } from '@/types';

interface ApproverRequestItem {
  id: string;
  sourceFacilityName: string;
  destinationFacilityName: string;
  bloodGroup: BloodGroup;
  componentType: ComponentType;
  quantity: number;
  availableToShare: number;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  reason: string;
  requestedBy: string;
  shortageContext?: string;
}

const INITIAL_APPROVER_QUEUE: ApproverRequestItem[] = [
  {
    id: 'TR-TRY-8821',
    sourceFacilityName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    destinationFacilityName: 'Manapparai Highway Trauma Unit (Simulated)',
    bloodGroup: 'O_NEGATIVE',
    componentType: 'RBC',
    quantity: 6,
    availableToShare: 8,
    priority: 'EMERGENCY',
    status: 'PENDING_APPROVAL',
    reason: 'Acute O- deficit following NH 83 highway collision with multiple trauma victims requiring immediate surgery.',
    requestedBy: 'Dr. Rajesh Kumar (Manapparai Trauma)',
    shortageContext: 'Manapparai current stock: 1 unit (Critical deficit vs safety target 6 units).',
  },
  {
    id: 'TR-TRY-8823',
    sourceFacilityName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    destinationFacilityName: 'Thuraiyur Taluk Community Hospital (Simulated)',
    bloodGroup: 'B_NEGATIVE',
    componentType: 'RBC',
    quantity: 3,
    availableToShare: 6,
    priority: 'URGENT',
    status: 'PENDING_APPROVAL',
    reason: 'Postpartum hemorrhage emergency in rural obstetric ward.',
    requestedBy: 'Dr. Meenakshi Sundaram',
    shortageContext: 'Thuraiyur safety target is 4 units. Local stock at 0 units.',
  },
];

export function ApproverDashboard() {
  const { currentUser, canApproveTransfer, canRejectTransfer } = useAuthStore();
  const { logAction } = useAuditStore();
  const [requests, setRequests] = useState<ApproverRequestItem[]>(INITIAL_APPROVER_QUEUE);
  const [rejectingItem, setRejectingItem] = useState<ApproverRequestItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pendingCount = requests.filter(r => r.status === 'PENDING_APPROVAL').length;
  const criticalCount = requests.filter(r => r.status === 'PENDING_APPROVAL' && r.priority === 'EMERGENCY').length;

  const handleApprove = (req: ApproverRequestItem) => {
    if (!canApproveTransfer()) {
      setFeedbackMessage({
        type: 'error',
        text: 'Only Authorized Approvers hold clinical transfer authorization privileges.'
      });
      return;
    }

    setRequests(prev =>
      prev.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r)
    );

    logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'TRANSFER_APPROVED',
      entityType: 'TRANSFER_REQUEST',
      entityId: req.id,
      oldValue: 'Waiting for approval',
      newValue: 'Approved for dispatch',
      reason: `Clinical authorization signed by ${currentUser.name}. ${req.reason}`,
    });

    dispatchNotification({
      event: 'TRANSFER_APPROVED',
      scenarioName: 'Trichy Regional Clinical Approval',
      transferId: req.id,
      sourceFacility: req.sourceFacilityName,
      destinationFacility: req.destinationFacilityName,
      bloodGroup: req.bloodGroup,
      componentType: req.componentType,
      units: req.quantity,
    });

    setFeedbackMessage({
      type: 'success',
      text: `Transfer ${req.id} approved successfully. Logistics staff notified for dispatch.`
    });
  };

  const handleOpenRejectModal = (req: ApproverRequestItem) => {
    setRejectingItem(req);
    setRejectionReason('');
  };

  const handleConfirmReject = () => {
    if (!rejectingItem) return;
    if (!canRejectTransfer()) {
      setFeedbackMessage({
        type: 'error',
        text: 'Only Authorized Approvers can reject clinical transfers.'
      });
      return;
    }

    const trimmed = rejectionReason.trim();
    if (!trimmed) {
      setFeedbackMessage({
        type: 'error',
        text: 'A specific clinical or operational reason is required when rejecting a transfer.'
      });
      return;
    }

    setRequests(prev =>
      prev.map(r => r.id === rejectingItem.id ? { ...r, status: 'REJECTED' } : r)
    );

    logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'TRANSFER_REJECTED',
      entityType: 'TRANSFER_REQUEST',
      entityId: rejectingItem.id,
      oldValue: 'Waiting for approval',
      newValue: 'Request rejected',
      reason: `Rejected by ${currentUser.name}: ${trimmed}`,
    });

    setFeedbackMessage({
      type: 'success',
      text: `Transfer ${rejectingItem.id} has been rejected with recorded reason.`
    });

    setRejectingItem(null);
    setRejectionReason('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif font-bold text-stone-900 tracking-tight">Clinical Approvals & Transfer Oversight</h1>
            <span className="text-[11px] font-semibold bg-[#841A2B]/10 text-[#841A2B] px-2 py-0.5 rounded border border-[#841A2B]/20">
              Authorized Approver
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Review pending inter-facility blood transfer requests. Clinical sign-off is required before cold-chain dispatch.
          </p>
        </div>

        <Link
          to="/requests"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors border border-stone-200"
        >
          View Full Transfer Registry <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className={cn(
          'p-3 rounded-lg border text-xs flex items-center justify-between',
          feedbackMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-red-50 text-red-800 border-red-200'
        )}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
            <span className="font-medium">{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-stone-400 hover:text-stone-700 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold font-mono text-amber-700">{pendingCount}</p>
          <p className="text-xs text-stone-500 mt-0.5 font-medium">Pending Approvals</p>
          <p className="text-[11px] text-stone-400 mt-1">Awaiting clinical review</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold font-mono text-[#841A2B]">{criticalCount}</p>
          <p className="text-xs text-stone-500 mt-0.5 font-medium">Emergency Shortages</p>
          <p className="text-[11px] text-stone-400 mt-1">Priority trauma cases</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold font-mono text-emerald-700">100%</p>
          <p className="text-xs text-stone-500 mt-0.5 font-medium">Safe-to-Share Compliance</p>
          <p className="text-[11px] text-stone-400 mt-1">Source local reserves protected</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold font-mono text-stone-800">&lt; 15 min</p>
          <p className="text-xs text-stone-500 mt-0.5 font-medium">Average Review Time</p>
          <p className="text-[11px] text-stone-400 mt-1">Regional coordination protocol</p>
        </div>
      </div>

      {/* Pending Clinical Approvals Queue */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Pending Transfer Requests Requiring Action</h2>
            <p className="text-xs text-stone-500">Every decision is logged to the immutable activity history.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
            {pendingCount} waiting
          </span>
        </div>

        {requests.filter(r => r.status === 'PENDING_APPROVAL').length === 0 ? (
          <div className="p-8 text-center text-stone-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-stone-800">All transfer requests have been reviewed.</p>
            <p className="text-xs text-stone-400 mt-1">New transfer requests will appear here when submitted by hospital staff.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {requests.filter(r => r.status === 'PENDING_APPROVAL').map((req) => (
              <div key={req.id} className="p-5 hover:bg-stone-50/50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left: Request Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-800">{req.id}</span>
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded border uppercase',
                        req.priority === 'EMERGENCY' ? 'bg-red-50 text-red-800 border-red-200' :
                        req.priority === 'URGENT' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-stone-100 text-stone-700 border-stone-200'
                      )}>
                        {req.priority}
                      </span>
                      <span className="text-xs font-bold text-[#841A2B] bg-[#FDF2F4] px-2 py-0.5 rounded border border-[#841A2B]/20">
                        {req.quantity} Units {formatBloodGroup(req.bloodGroup)} ({COMPONENT_LABELS[req.componentType]})
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2 text-xs text-stone-600">
                      <div>
                        <span className="text-stone-400 block text-[10px] uppercase font-bold">Sending Facility (Source)</span>
                        <span className="font-medium text-stone-900">{req.sourceFacilityName}</span>
                        <span className="block text-[11px] text-emerald-700 mt-0.5">
                          ✓ Available for sharing: {req.availableToShare} units (Safety target protected)
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px] uppercase font-bold">Receiving Facility (Destination)</span>
                        <span className="font-medium text-stone-900">{req.destinationFacilityName}</span>
                        {req.shortageContext && (
                          <span className="block text-[11px] text-red-700 mt-0.5 font-medium">
                            ⚠ {req.shortageContext}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs">
                      <span className="text-stone-500 font-semibold">Clinical Justification: </span>
                      <span className="text-stone-700">{req.reason}</span>
                      <span className="block text-[11px] text-stone-400 mt-1">Requested by: {req.requestedBy}</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex sm:flex-col gap-2 flex-shrink-0 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApprove(req)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#841A2B] hover:bg-[#6b1523] rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRejectModal(req)}
                      className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-red-700 bg-white hover:bg-red-50 border border-stone-200 hover:border-red-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Reject Request
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mandatory Rejection Reason Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Mandatory Rejection Reason</h3>
                <p className="text-xs text-stone-500">Provide clinical justification for declining transfer {rejectingItem.id}.</p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label htmlFor="rejection-reason" className="block text-xs font-semibold text-stone-700">
                Reason for Rejection <span className="text-red-600">*</span>
              </label>
              <textarea
                id="rejection-reason"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Local inventory priority required for active obstetrics emergency; recommend requesting from alternate hub..."
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:border-[#841A2B] focus:ring-1 focus:ring-[#841A2B] outline-none"
              />
              <p className="text-[10px] text-stone-400">This clinical reason is recorded in the permanent audit trail.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim()}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors',
                  rejectionReason.trim()
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
