import { useState } from 'react';
import {
  AlertTriangle, Clock, ArrowRight, ShieldCheck, CheckCircle2,
  Package, Building2, RefreshCw, Calendar, Sparkles, Filter,
  Check, Info, RotateCcw
} from 'lucide-react';
import { DEMO_INVENTORY_BATCHES, DEMO_SHORTAGES, DEMO_ORGANIZATIONS } from '@/lib/demo-data';
import { sortBatchesFEFO, detectExpiryRescueOpportunities, type ExpiryRescueMatch } from '@/lib/fefo-engine';
import { useAuthStore } from '@/lib/auth-store';
import { useAuditStore } from '@/lib/audit-store';
import { cn, formatBloodGroup, COMPONENT_LABELS } from '@/lib/utils';
import type { InventoryBatch, BloodGroup } from '@/types';

export function ExpiryRescuePage() {
  const [batches, setBatches] = useState<InventoryBatch[]>(DEMO_INVENTORY_BATCHES);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('ALL');
  const [rotatedIds, setRotatedIds] = useState<Set<string>>(new Set());

  const { currentUser } = useAuthStore();
  const { logAction } = useAuditStore();

  const sortedBatches = sortBatchesFEFO(batches).filter(b => {
    if (selectedBloodGroup !== 'ALL' && b.bloodGroup !== selectedBloodGroup) return false;
    return true;
  });

  const shortageInputs = DEMO_SHORTAGES.map(s => ({
    organizationId: s.organizationId,
    organizationName: s.organizationName || s.organizationId,
    bloodGroup: s.bloodGroup as BloodGroup,
    componentType: s.componentType as any,
    projectedDeficit: s.projectedDeficit,
    daysToShortage: 3,
  }));

  const rotationOpportunities = detectExpiryRescueOpportunities(batches, shortageInputs);

  const handlePlanRotation = (match: ExpiryRescueMatch) => {
    setRotatedIds(prev => new Set(prev).add(match.id));
    logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'STOCK_ROTATION_PLANNED',
      entityType: 'EXPIRY_BATCH',
      entityId: match.id,
      oldValue: `Expiring soon at ${match.sourceOrganizationName}`,
      newValue: `Rotated transfer of ${match.unitsExpiring} units to ${match.destinationOrganizationName}`,
      reason: match.reason,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#841A2B]">
              Wastage Prevention
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-stone-500 font-medium">FEFO Inventory Management</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Expiring Blood & Stock Rotation
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Identify blood batches approaching expiry and rotate stock using First Expire, First Out (FEFO) guidance.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-[#FDF2F4] text-[#841A2B] flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">Rotation Opportunities</span>
            <p className="text-lg font-bold font-mono text-stone-900 leading-tight">
              {rotationOpportunities.length} batches
            </p>
          </div>
        </div>
      </div>

      {/* 2. Educational Rule Banner */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs flex items-start gap-3">
        <Info className="w-4 h-4 text-[#841A2B] mt-0.5 flex-shrink-0" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-stone-900">
            First Expire, First Out (FEFO) Operational Guidance:
          </p>
          <p className="text-stone-600 leading-relaxed text-[11px]">
            "Use batches with the earliest expiry date first, where clinically and operationally appropriate." Blood products approaching expiry are matched with nearby facilities reporting upcoming demand to prevent discard.
          </p>
        </div>
      </div>

      {/* 3. Recommended Stock Rotation Opportunities */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#841A2B]" />
            Recommended Stock Rotations
          </h3>
          <span className="text-xs text-stone-500">
            Matched by expiry countdown and deficit need
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rotationOpportunities.length === 0 ? (
            <div className="col-span-2 p-8 rounded-xl border border-stone-200 bg-white text-center text-xs text-stone-500">
              No urgent stock rotation matches required at this time. All batches have adequate shelf life.
            </div>
          ) : (
            rotationOpportunities.map(match => {
              const isRotated = rotatedIds.has(match.id);

              return (
                <div
                  key={match.id}
                  className="p-5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-4 hover:border-stone-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-800">
                        {match.id}
                      </span>
                      <span className={cn(
                        'text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border',
                        isRotated
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      )}>
                        {isRotated ? 'Rotation Transfer Planned' : `${match.daysToExpiry * 24} Hours Shelf Life Remaining`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-stone-900 pt-1">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-semibold text-stone-400 block">Current Location</span>
                        <p className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-stone-400" />
                          {match.sourceOrganizationName}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#841A2B] mx-2" />
                      <div className="space-y-0.5 text-right">
                        <span className="text-[10px] uppercase font-semibold text-stone-400 block">Deficit Hospital</span>
                        <p className="flex items-center gap-1.5 justify-end">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                          {match.destinationOrganizationName}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-medium">Product</span>
                        <p className="font-bold text-stone-900">{formatBloodGroup(match.bloodGroup)} • {COMPONENT_LABELS[match.componentType]}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-stone-400 uppercase font-medium">Batch Quantity</span>
                        <p className="font-bold font-mono text-[#841A2B] text-sm">{match.unitsExpiring} units</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-stone-600 italic">
                      "{match.reason}"
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[11px] text-stone-500">
                      Creates transfer in "Waiting for approval" state
                    </span>
                    <button
                      type="button"
                      disabled={isRotated}
                      onClick={() => handlePlanRotation(match)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5',
                        isRotated
                          ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                          : 'bg-[#841A2B] hover:bg-[#701524] text-white shadow-2xs'
                      )}
                    >
                      {isRotated ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Rotation Planned
                        </>
                      ) : (
                        'Plan Stock Rotation Transfer'
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Complete Inventory Batch Expiry Timeline */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Individual Batch Expiry Schedule
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Strictly ordered by earliest expiration date first (FEFO sequence).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={selectedBloodGroup}
              onChange={e => setSelectedBloodGroup(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900"
            >
              <option value="ALL">All Blood Groups</option>
              {['O_POSITIVE', 'O_NEGATIVE', 'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE'].map(b => (
                <option key={b} value={b}>{formatBloodGroup(b as BloodGroup)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50/80 text-stone-500 text-[10px] uppercase font-semibold border-b border-stone-200">
                <th className="py-2.5 px-4">Batch DIN</th>
                <th className="py-2.5 px-4">Facility</th>
                <th className="py-2.5 px-4">Blood Group</th>
                <th className="py-2.5 px-4">Component</th>
                <th className="py-2.5 px-4 text-center">Units</th>
                <th className="py-2.5 px-4">Expiry Date</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {sortedBatches.slice(0, 8).map(batch => {
                const isNearExpiry = batch.status === 'NEAR_EXPIRY';

                return (
                  <tr key={batch.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">{batch.batchNumber}</td>
                    <td className="py-3 px-4 text-stone-700">{batch.organizationName}</td>
                    <td className="py-3 px-4 font-semibold">{formatBloodGroup(batch.bloodGroup)}</td>
                    <td className="py-3 px-4 text-stone-600">{COMPONENT_LABELS[batch.componentType]}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-stone-900">{batch.quantity}</td>
                    <td className="py-3 px-4 text-stone-600">{new Date(batch.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                        isNearExpiry
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-stone-50 text-stone-600 border-stone-200'
                      )}>
                        {isNearExpiry ? 'Near Expiry (< 48h)' : 'Fresh Stock'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
