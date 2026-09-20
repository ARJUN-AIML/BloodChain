import { useState } from 'react';
import {
  FileText, Zap, ShieldCheck, CheckCircle2, Lock, ArrowRight,
  Clock, Building2, UserCheck, AlertTriangle, ShieldAlert,
} from 'lucide-react';
import { cn, formatBloodGroup } from '@/lib/utils';
import { DEMO_REQUESTS, DEMO_ALLOCATION, DEMO_RECOMMENDATIONS } from '@/lib/demo-data';
import { useAuthStore } from '@/lib/auth-store';
import { useAuditStore } from '@/lib/audit-store';
import type { TransferRecommendation } from '@/types';

export function RequestsPage() {
  const [recommendations, setRecommendations] = useState<TransferRecommendation[]>(
    DEMO_RECOMMENDATIONS as TransferRecommendation[]
  );

  const { currentUser, canApproveTransfer } = useAuthStore();
  const { logAction } = useAuditStore();
  const hasApprovalRights = canApproveTransfer();

  const handleApproveTransfer = (rec: TransferRecommendation) => {
    if (!hasApprovalRights) return;

    setRecommendations(prev =>
      prev.map(r => r.id === rec.id ? { ...r, status: 'APPROVED', approvedBy: currentUser.name, approvedAt: new Date().toLocaleTimeString() } : r)
    );

    logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'TRANSFER_APPROVED',
      entityType: 'TRANSFER_RECOMMENDATION',
      entityId: rec.id,
      oldValue: 'PENDING_APPROVAL',
      newValue: 'APPROVED / IN_TRANSIT',
      reason: `Authorized human approval granted by ${currentUser.name} (${currentUser.role}). ${rec.reason}`,
      recommendationId: rec.id,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E2DC]">
        <div>
          <h2 className="text-xl font-bold text-[#1A1F26] tracking-tight">Multi-Hospital Allocation & Authorized Human Approval</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            OR-Tools decision-support recommendations require explicit human-in-the-loop authorization before dispatch.
          </p>
        </div>

        {/* Authorization Banner */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold',
          hasApprovalRights
            ? 'bg-[#E3EFEA] border-[#C5E1D4] text-[#2C6E49]'
            : 'bg-[#FAF0D6] border-[#EAEAE5] text-[#BE8226]'
        )}>
          <UserCheck className="w-4 h-4" />
          <span>
            {hasApprovalRights
              ? `Logged in as ${currentUser.name} (Authorized Approver)`
              : `Current Role: ${currentUser.role.replace('_', ' ')} (Read-Only Approval)`}
          </span>
        </div>
      </div>

      {/* Human Approval Recommendations Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#C85A3F]" />
          Pending Transfer Recommendations (Human Approval Required)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map(rec => {
            const isApproved = rec.status === 'APPROVED';

            return (
              <div
                key={rec.id}
                className={cn(
                  'p-5 rounded-xl bg-white border shadow-sm space-y-3 flex flex-col justify-between transition-all',
                  isApproved ? 'border-[#C5E1D4] bg-[#F7FCF9]' : 'border-[#E2E2DC] hover:border-[#C85A3F]'
                )}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FAF9F6] border border-[#E2E2DC] text-[#1A1F26]">
                      {rec.id}
                    </span>
                    <span className={cn(
                      'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      isApproved ? 'bg-[#E3EFEA] text-[#2C6E49]' : 'bg-[#FAF0D6] text-[#BE8226]'
                    )}>
                      {isApproved ? 'Approved / In Transit' : 'Pending Human Approval'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-[#1A1F26]">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#64748B]" />
                      <span>{rec.sourceOrganizationName}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#C85A3F]" />
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#2C6E49]" />
                      <span>{rec.destinationOrganizationName}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E2DC] text-xs space-y-1">
                    <div className="flex justify-between font-bold text-[#1A1F26]">
                      <span>Product: {rec.bloodGroup.replace('_', ' ')} {rec.componentType}</span>
                      <span className="font-mono text-[#C85A3F]">{rec.quantityRecommended} Units</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] leading-relaxed pt-1">
                      <strong className="text-[#1A1F26]">AI Reasoning: </strong>{rec.reason}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E2DC] flex items-center justify-between">
                  <span className="text-[11px] text-[#64748B] font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Est. Transit: {rec.estimatedTravelMinutes} mins
                  </span>

                  {isApproved ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#2C6E49]">
                      <CheckCircle2 className="w-4 h-4 text-[#2C6E49]" />
                      <span>Approved by {rec.approvedBy}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApproveTransfer(rec)}
                      disabled={!hasApprovalRights}
                      className={cn(
                        'px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-flat',
                        hasApprovalRights
                          ? 'bg-[#C85A3F] text-white hover:bg-[#A8432B]'
                          : 'bg-[#FAF9F6] text-[#64748B] border border-[#E2E2DC] cursor-not-allowed opacity-75'
                      )}
                    >
                      {hasApprovalRights ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Approve Transfer
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-[#BE8226]" />
                          Requires Authorized Approver
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Solver & Active Requests Reference Grid */}
      <div className="grid lg:grid-cols-2 gap-6 pt-2">
        {/* Active Requests */}
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat space-y-3">
          <div className="pb-2 border-b border-[#E2E2DC]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1F26]">Active Hospital Emergency Requests</h3>
          </div>

          <div className="space-y-2.5">
            {DEMO_REQUESTS.map(r => (
              <div key={r.id} className="p-3 rounded-lg border border-[#E2E2DC] bg-[#FAF9F6] text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-[#1A1F26]">{r.id}</span>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase',
                    r.priority === 'EMERGENCY' ? 'bg-[#C85A3F] text-[#FFFFFF]' : 'bg-[#BE8226] text-[#FFFFFF]'
                  )}>
                    {r.priority}
                  </span>
                </div>
                <p className="font-bold text-[#1A1F26]">{r.organizationName}</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {formatBloodGroup(r.bloodGroup)} {r.componentType} • <strong className="text-[#1A1F26]">{r.unitsNeeded} units needed</strong>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* OR Tools Solver Breakdown */}
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E2DC]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#BE8226]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1F26]">OR-Tools Solver Metrics</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#E3EFEA] text-[#2C6E49] text-[10px] font-bold">
              OPTIMAL SOLVED
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E2DC]">
              <p className="text-xl font-bold text-[#2C6E49] font-mono">{DEMO_ALLOCATION.totalAllocated}</p>
              <p className="text-[10px] text-[#64748B]">Units Allocated</p>
            </div>
            <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E2DC]">
              <p className="text-xl font-bold text-[#1A1F26] font-mono">{DEMO_ALLOCATION.totalNeeded}</p>
              <p className="text-[10px] text-[#64748B]">Units Needed</p>
            </div>
            <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E2DC]">
              <p className="text-xl font-bold text-[#5C768D] font-mono">{DEMO_ALLOCATION.solverRuntimeMs}ms</p>
              <p className="text-[10px] text-[#64748B]">Solver Time</p>
            </div>
          </div>

          <p className="text-[11px] text-[#64748B] leading-relaxed">{DEMO_ALLOCATION.explanation}</p>
        </div>
      </div>
    </div>
  );
}
