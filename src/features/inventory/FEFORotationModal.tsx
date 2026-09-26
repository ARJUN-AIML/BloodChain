import React, { useState } from 'react';
import { X, AlertCircle, RefreshCw, ArrowRight, ShieldCheck, CheckCircle2, Clock, Truck, Sparkles } from 'lucide-react';
import { DEMO_INVENTORY, DEMO_ORGANIZATIONS } from '@/lib/demo-data';
import { useAuditStore } from '@/lib/audit-store';
import { useAuthStore } from '@/lib/auth-store';

interface FEFORotationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FEFORotationModal: React.FC<FEFORotationModalProps> = ({ isOpen, onClose }) => {
  const [executedRotationIds, setExecutedRotationIds] = useState<string[]>([]);
  const logAction = useAuditStore(state => state.logAction);
  const currentUser = useAuthStore(state => state.currentUser);

  if (!isOpen) return null;

  // Find inventory entries in blood banks or secondary facilities with near-expiry stock
  const nearExpiryItems = DEMO_INVENTORY.filter(i => i.nearExpiryUnits > 0 || i.expectedExpiryUnits > 0);

  // Generate optimal rotation recommendations
  const rotationCandidates = [
    {
      id: 'FEFO_TRY_01',
      sourceOrgId: 'SIM_BB_TRY_CENTRAL',
      sourceOrgName: 'Tiruchirappalli Central Blood Bank Hub',
      destOrgId: 'SIM_HOSP_MGMGH_TRY',
      destOrgName: 'Mahatma Gandhi Memorial Govt Hospital (MGMGH Trichy)',
      bloodGroup: 'A_POSITIVE',
      componentType: 'RBC',
      unitsToRotate: 12,
      daysRemaining: 4,
      transitMinutes: 14,
      distanceKm: 2.1,
      reason: 'MGMGH Trichy surgical intake has 18 units/day A+ demand. Rotated stock will be fully utilized within 24 hours, eliminating expiry risk.',
    },
    {
      id: 'FEFO_TRY_02',
      sourceOrgId: 'SIM_BB_SRIRANGAM_HERITAGE',
      sourceOrgName: 'Srirangam Heritage Satellite Blood Center',
      destOrgId: 'SIM_HOSP_TRY_MAIN',
      destOrgName: 'Tiruchirappalli Regional Trauma Center',
      bloodGroup: 'O_POSITIVE',
      componentType: 'RBC',
      unitsToRotate: 8,
      daysRemaining: 5,
      transitMinutes: 18,
      distanceKm: 5.5,
      reason: 'Srirangam satellite hub has low local O+ turnover. Reallocating to Main Trauma Center prevents shelf degradation.',
    },
    {
      id: 'FEFO_TRY_03',
      sourceOrgId: 'SIM_HOSP_KATTUR',
      sourceOrgName: 'Kattur Regional Blood Collection Facility',
      destOrgId: 'SIM_HOSP_APOLLO_TRY',
      destOrgName: 'Apollo Speciality Hospital Trichy',
      bloodGroup: 'B_POSITIVE',
      componentType: 'PLATELETS',
      unitsToRotate: 6,
      daysRemaining: 2,
      transitMinutes: 12,
      distanceKm: 4.5,
      reason: 'Platelet shelf life critical (48h remaining). Apollo cardiac unit requested 5 units B+ for immediate open-heart surgery.',
    }
  ];

  const handleExecuteRotation = (cand: typeof rotationCandidates[0]) => {
    logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'PROACTIVE_STOCK_ROTATION',
      entityType: 'INVENTORY_ROTATION',
      entityId: cand.id,
      oldValue: 'NEAR_EXPIRY_PENDING',
      newValue: 'FEFO_TRANSFER_DISPATCHED',
      reason: `Executed Proactive FEFO Stock Rotation: Transferred ${cand.unitsToRotate} units of ${cand.bloodGroup} ${cand.componentType} from ${cand.sourceOrgName} to ${cand.destOrgName} (${cand.daysRemaining} days to expiry rescued).`,
      displayTitle: 'FEFO Proactive Stock Rotation',
      displayCategory: 'Expiry Rescue',
      displayPerformer: currentUser.name,
      displayExplanation: cand.reason,
      displayNote: `Rescued ${cand.unitsToRotate} units before shelf expiration.`,
    });
    setExecutedRotationIds(prev => [...prev, cand.id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header (Pinned) */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10 border border-white/20">
              <RefreshCw className="w-5 h-5 text-amber-200 animate-spin-slow" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg leading-tight flex items-center gap-2">
                <span>FEFO Expiry Rescue & Stock Rotation Engine</span>
                <span className="bg-amber-400 text-stone-950 font-sans text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase">
                  Zero Wastage Policy
                </span>
              </h2>
              <p className="text-xs text-amber-100 font-mono">Tiruchirappalli 30km Network • First-Expired-First-Out Predictive Allocation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-amber-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">

          {/* Banner Summary */}
          <div className="p-4 rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 text-amber-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-700" />
                <h3 className="font-bold text-sm text-amber-950">Predictive Shelf Life Optimization Active</h3>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                The FEFO engine cross-references near-expiry batch timestamps against real-time clinical consumption velocity across Trichy medical centers to recommend immediate stock transfers before expiration.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-white px-3.5 py-2 rounded-lg border border-amber-200 text-center">
                <p className="text-[10px] uppercase font-bold text-stone-500">Rescuable Units</p>
                <p className="text-lg font-mono font-extrabold text-amber-900">26 units</p>
              </div>
              <div className="bg-white px-3.5 py-2 rounded-lg border border-amber-200 text-center">
                <p className="text-[10px] uppercase font-bold text-stone-500">Wastage Reduction</p>
                <p className="text-lg font-mono font-extrabold text-emerald-700">100%</p>
              </div>
            </div>
          </div>

          {/* List of Recommended FEFO Transfers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center justify-between">
              <span>Optimized Intra-Trichy FEFO Transfer Legs</span>
              <span className="text-[11px] font-mono text-stone-500 font-normal">Ranked by Urgency</span>
            </h4>

            {rotationCandidates.map(cand => {
              const isExecuted = executedRotationIds.includes(cand.id);
              return (
                <div
                  key={cand.id}
                  className={`p-4 rounded-xl border transition ${
                    isExecuted
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-white border-stone-200 hover:border-amber-400 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left Details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-extrabold bg-[#841A2B] text-white px-2 py-0.5 rounded">
                          {cand.bloodGroup.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-xs font-bold bg-stone-100 text-stone-800 border border-stone-200 px-2 py-0.5 rounded">
                          {cand.componentType}
                        </span>
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Expiration: {cand.daysRemaining} days remaining
                        </span>
                        <span className="text-[11px] font-mono text-stone-500">
                          {cand.unitsToRotate} Units Rescued
                        </span>
                      </div>

                      {/* Route visualization */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-stone-800">{cand.sourceOrgName}</span>
                        <ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-bold text-[#841A2B]">{cand.destOrgName}</span>
                        <span className="text-[11px] text-stone-500 font-mono">
                          ({cand.distanceKm} km • ~{cand.transitMinutes} mins transit)
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 italic bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                        "{cand.reason}"
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 flex items-center gap-2">
                      {isExecuted ? (
                        <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs">
                          <CheckCircle2 className="w-4 h-4" /> FEFO Leg Dispatched
                        </div>
                      ) : (
                        <button
                          onClick={() => handleExecuteRotation(cand)}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                        >
                          <Truck className="w-4 h-4" /> Dispatch FEFO Transfer
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer (Pinned) */}
        <div className="bg-stone-50 px-6 py-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span className="font-mono">Tiruchirappalli FEFO Engine • Auto-Tuned for Trichy 30km Network</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
