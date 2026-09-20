import { useState } from 'react';
import {
  AlertTriangle, Clock, ArrowRight, ShieldCheck, CheckCircle2,
  Package, Building2, RefreshCw, Calendar, Sparkles, Filter,
} from 'lucide-react';
import { DEMO_INVENTORY_BATCHES, DEMO_SHORTAGES, DEMO_ORGANIZATIONS } from '@/lib/demo-data';
import { sortBatchesFEFO, detectExpiryRescueOpportunities, type ExpiryRescueMatch } from '@/lib/fefo-engine';
import { useAuthStore } from '@/lib/auth-store';
import { useAuditStore } from '@/lib/audit-store';
import type { InventoryBatch, BloodGroup } from '@/types';

export function ExpiryRescuePage() {
  const [batches, setBatches] = useState<InventoryBatch[]>(DEMO_INVENTORY_BATCHES);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('ALL');
  const [rescuedIds, setRescuedIds] = useState<Set<string>>(new Set());

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

  const rescueMatches = detectExpiryRescueOpportunities(batches, shortageInputs);

  const handleInitiateRescue = (match: ExpiryRescueMatch) => {
    setRescuedIds(prev => new Set(prev).add(match.id));
    logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EXPIRY_RESCUE_INITIATED',
      entityType: 'EXPIRY_RESCUE',
      entityId: match.id,
      oldValue: `Expiring at ${match.sourceOrganizationName}`,
      newValue: `Rescued transfer of ${match.unitsExpiring} units to ${match.destinationOrganizationName}`,
      reason: match.reason,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#8C2D19] to-[#C85A3F] text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-[#FFD166]" />
            <h2 className="text-xl font-bold tracking-tight">Expiry Rescue & FEFO Inventory Engine</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFD166]/20 text-[#FFD166] border border-[#FFD166]/30 uppercase tracking-wider">
              Zero Spoilage Target
            </span>
          </div>
          <p className="text-xs text-white/90 max-w-2xl leading-relaxed">
            Automatically applies <strong className="text-white">First Expiry, First Out (FEFO)</strong> batching and pairs near-expiring blood products with upcoming shortage risks at neighboring hospitals to eliminate wastage.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 p-3.5 rounded-xl border border-white/10 backdrop-blur-sm">
          <div className="text-right">
            <p className="text-[10px] text-white/80 font-semibold uppercase tracking-wider">Active Rescue Opportunities</p>
            <p className="text-2xl font-bold text-[#FFD166]">{rescueMatches.length} Batches</p>
          </div>
        </div>
      </div>

      {/* Expiry Rescue Matches Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#1A1F26] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C85A3F]" />
            AI-Matched Expiry Rescue Opportunities
          </h3>
          <span className="text-[10px] text-[#64748B] font-mono">Matched by FEFO Expiry & Shortage Window</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rescueMatches.length === 0 ? (
            <div className="col-span-2 p-6 rounded-xl border border-[#E2E2DC] bg-white text-center text-xs text-[#64748B]">
              No urgent expiry rescue matches required at this time. All near-expiry units are protected.
            </div>
          ) : (
            rescueMatches.map(match => {
              const isRescued = rescuedIds.has(match.id);
              return (
                <div
                  key={match.id}
                  className="p-4 rounded-xl bg-white border border-[#E2E2DC] shadow-sm space-y-3 flex flex-col justify-between hover:border-[#D99B38] transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#FAF0D6] text-[#BE8226] border border-[#EAEAE5]">
                        Rescue Opportunity Score: {match.rescueOpportunityScore}/100
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-mono text-[#C85A3F] font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        {match.daysToExpiry} days to expiry
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5 font-bold text-[#1A1F26]">
                        <Building2 className="w-4 h-4 text-[#64748B]" />
                        <span>{match.sourceOrganizationName}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#C85A3F]" />
                      <div className="flex items-center gap-1.5 font-bold text-[#1A1F26]">
                        <Building2 className="w-4 h-4 text-[#2C6E49]" />
                        <span>{match.destinationOrganizationName}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E2E2DC] text-[11px] text-[#64748B] leading-relaxed">
                      {match.reason}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#E2E2DC]">
                    <span className="text-xs font-bold text-[#1A1F26]">
                      Rescue Package: <span className="text-[#C85A3F] font-mono">{match.unitsExpiring} Units</span> {match.bloodGroup.replace('_', ' ')} {match.componentType}
                    </span>

                    <button
                      disabled={isRescued}
                      onClick={() => handleInitiateRescue(match)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-[#C85A3F] text-white hover:bg-[#A8432B] disabled:opacity-50 disabled:bg-[#5C768D]"
                    >
                      {isRescued ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Rescue Initiated
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Initiate FEFO Transfer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FEFO Inventory Batch Table */}
      <div className="rounded-xl border border-[#E2E2DC] bg-white overflow-hidden shadow-sm space-y-0">
        <div className="px-5 py-3.5 border-b border-[#E2E2DC] bg-[#FAF9F6] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#1A1F26] flex items-center gap-2">
            <Package className="w-4 h-4 text-[#64748B]" />
            FEFO Batch Inventory Tracking (Earliest Expiry First)
          </h3>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#64748B]" />
            <select
              value={selectedBloodGroup}
              onChange={e => setSelectedBloodGroup(e.target.value)}
              className="px-2.5 py-1 text-xs rounded border border-[#E2E2DC] bg-white font-medium"
            >
              <option value="ALL">All Blood Groups</option>
              <option value="O_POSITIVE">O+ Positive</option>
              <option value="O_NEGATIVE">O- Negative</option>
              <option value="A_POSITIVE">A+ Positive</option>
              <option value="B_POSITIVE">B+ Positive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F4F4F0] border-b border-[#E2E2DC] text-[10px] font-bold uppercase text-[#64748B]">
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Facility</th>
                <th className="py-3 px-3">Blood Product</th>
                <th className="py-3 px-3 font-mono">Collection Date</th>
                <th className="py-3 px-3 font-mono">Expiry Date</th>
                <th className="py-3 px-3 font-mono text-center">Days Left</th>
                <th className="py-3 px-3 font-mono text-center">Total Qty</th>
                <th className="py-3 px-3 font-mono text-center">Reserved</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Storage Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E2DC]">
              {sortedBatches.map(batch => (
                <tr key={batch.id} className="hover:bg-[#FAF9F6] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#1A1F26]">
                    {batch.batchNumber}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#1A1F26]">
                    {batch.organizationName || batch.organizationId}
                  </td>
                  <td className="py-3 px-3 font-bold text-[#C85A3F]">
                    {batch.bloodGroup.replace('_', ' ')} {batch.componentType}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#64748B]">
                    {batch.collectionDate}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-[#1A1F26]">
                    {batch.expiryDate}
                  </td>
                  <td className="py-3 px-3 font-mono text-center font-bold">
                    <span className={batch.daysToExpiry <= 5 ? 'text-[#C85A3F]' : 'text-[#2C6E49]'}>
                      {batch.daysToExpiry} d
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-center font-bold text-[#1A1F26]">
                    {batch.quantity}
                  </td>
                  <td className="py-3 px-3 font-mono text-center text-[#BE8226]">
                    {batch.reservedQuantity}
                  </td>
                  <td className="py-3 px-4">
                    {batch.status === 'NEAR_EXPIRY' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF0D6] text-[#BE8226] border border-[#EAEAE5]">
                        Near Expiry
                      </span>
                    ) : batch.status === 'EXPIRED' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDF6F0] text-[#C85A3F] border border-[#F3D7C8]">
                        Expired
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3EFEA] text-[#2C6E49] border border-[#C5E1D4]">
                        Usable
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[11px] text-[#64748B]">
                    {batch.storageLocation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
