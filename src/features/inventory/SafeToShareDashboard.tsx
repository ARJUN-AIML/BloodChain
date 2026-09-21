import { useState } from 'react';
import {
  ShieldCheck, AlertTriangle, ArrowRight, Info, HelpCircle,
  TrendingUp, CheckCircle2, Lock, Building2, Droplet, ChevronDown, ChevronUp
} from 'lucide-react';
import { DEMO_ORGANIZATIONS, DEMO_INVENTORY, generateDemoForecasts } from '@/lib/demo-data';
import { calculateSafeToShare } from '@/lib/safe-to-share';
import { cn, formatBloodGroup, COMPONENT_LABELS } from '@/lib/utils';
import type { BloodGroup, ComponentType } from '@/types';

export function SafeToShareDashboard() {
  const [selectedOrgId, setSelectedOrgId] = useState<string>('ALL');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('O_POSITIVE');
  const [selectedComponent, setSelectedComponent] = useState<ComponentType>('RBC');
  const [showFormulaExplanation, setShowFormulaExplanation] = useState<boolean>(false);

  const forecasts = generateDemoForecasts();
  const bloodOrgs = DEMO_ORGANIZATIONS.filter(o => o.type === 'HOSPITAL' || o.type === 'BLOOD_BANK');

  // Compute Safe-to-Share calculations for all facilities
  const shareableItems = DEMO_INVENTORY.filter(inv => {
    if (selectedOrgId !== 'ALL' && inv.organizationId !== selectedOrgId) return false;
    if (inv.bloodGroup !== selectedBloodGroup) return false;
    if (inv.componentType !== selectedComponent) return false;
    return true;
  }).map(inv => {
    const org = bloodOrgs.find(o => o.id === inv.organizationId);
    const fc = forecasts.find(f => f.organizationId === inv.organizationId && f.bloodGroup === inv.bloodGroup && f.componentType === inv.componentType);

    const p50 = fc ? fc.p50 : Math.round(inv.availableUnits * 0.4);
    const p90 = fc ? fc.p90 : Math.round(p50 * 1.3);

    return calculateSafeToShare({
      organizationId: inv.organizationId,
      organizationName: org?.name || inv.organizationId,
      bloodGroup: inv.bloodGroup,
      componentType: inv.componentType,
      currentInventory: inv.availableUnits,
      reservedStock: inv.reservedUnits,
      p50Demand: p50,
      p90Demand: p90,
      safetyBuffer: 5,
    });
  });

  const totalShareable = shareableItems.reduce((acc, curr) => acc + curr.safeToShareUnits, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#841A2B]">
              Inventory Protection
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-stone-500 font-medium">Safe Rebalancing</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Blood Available for Sharing
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Check which blood units can be safely shared with other facilities without causing local shortages.
          </p>
        </div>

        {/* Total Available Shareable Badge */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-[#FDF2F4] text-[#841A2B] flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">Total Available to Share</span>
            <p className="text-lg font-bold font-mono text-stone-900 leading-tight">
              {totalShareable} units
            </p>
          </div>
        </div>
      </div>

      {/* 2. Plain-Language Filters */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
            Filter Blood Stock
          </h3>
          <span className="text-[11px] text-stone-500">
            Select facility and product to review shareable units
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 block">Facility</label>
            <select
              value={selectedOrgId}
              onChange={e => setSelectedOrgId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 focus:bg-white"
            >
              <option value="ALL">All Regional Facilities</option>
              {bloodOrgs.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 block">Blood Group</label>
            <select
              value={selectedBloodGroup}
              onChange={e => setSelectedBloodGroup(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 focus:bg-white"
            >
              {['O_POSITIVE', 'O_NEGATIVE', 'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE'].map(b => (
                <option key={b} value={b}>{formatBloodGroup(b as BloodGroup)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 block">Component</label>
            <select
              value={selectedComponent}
              onChange={e => setSelectedComponent(e.target.value as ComponentType)}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 focus:bg-white"
            >
              {['RBC', 'PLASMA', 'PLATELETS', 'WHOLE_BLOOD'].map(c => (
                <option key={c} value={c}>{COMPONENT_LABELS[c as ComponentType]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Facility Cards Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
            Facility Protection & Sharing Overview
          </h3>
          <span className="text-xs text-stone-500 font-mono">
            Showing {shareableItems.length} locations
          </span>
        </div>

        <div className="divide-y divide-stone-100">
          {shareableItems.map(item => {
            const hasSurplus = item.isSafeToShare && item.safeToShareUnits > 0;

            return (
              <div key={item.organizationId} className="p-4 hover:bg-stone-50/60 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Facility Info */}
                  <div className="space-y-1 max-w-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-stone-400 flex-shrink-0" />
                      <h4 className="text-xs font-bold text-stone-900">{item.organizationName}</h4>
                    </div>
                    <p className="text-[11px] text-stone-500 pl-6">
                      {formatBloodGroup(item.bloodGroup)} • {COMPONENT_LABELS[item.componentType]}
                    </p>
                  </div>

                  {/* Middle: Key Counts */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 text-center lg:text-left">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">Total In Stock</span>
                      <span className="text-sm font-bold font-mono text-stone-800">{item.currentInventory} units</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">Reserved</span>
                      <span className="text-sm font-mono text-stone-600">{item.reservedStock} units</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">Safety Level</span>
                      <span className="text-sm font-mono text-stone-600">{item.protectionLevel} units</span>
                    </div>

                    <div className="col-span-3 sm:col-span-1">
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">Available to Share</span>
                      <span className={cn(
                        'text-base font-bold font-mono',
                        hasSurplus ? 'text-[#841A2B]' : 'text-stone-400'
                      )}>
                        {item.safeToShareUnits} units
                      </span>
                    </div>
                  </div>

                  {/* Right: Sharing Status Badge */}
                  <div className="flex items-center justify-end">
                    <span className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5',
                      hasSurplus
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-stone-50 text-stone-600 border-stone-200'
                    )}>
                      {hasSurplus ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Safe to Share ({item.safeToShareUnits})
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-stone-400" />
                          Fully Protected (0)
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Expandable Technical Formula Explanation */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-stone-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-stone-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
              How Available Blood is Calculated (Technical Details)
            </span>
          </div>
          {showFormulaExplanation ? (
            <ChevronUp className="w-4 h-4 text-stone-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-500" />
          )}
        </button>

        {showFormulaExplanation && (
          <div className="px-5 pb-5 pt-2 border-t border-stone-100 space-y-3 text-xs text-stone-600 bg-stone-50/50">
            <div className="p-3 bg-white rounded-lg border border-stone-200 font-mono text-[11px] text-stone-800">
              Available to Share = MAX(0, Total Stock - Reserved Stock - Safety Protection Level)
            </div>
            <p className="text-[11px] leading-relaxed text-stone-600">
              • <strong>Total Stock:</strong> Number of unexpired units physically in cold storage.
            </p>
            <p className="text-[11px] leading-relaxed text-stone-600">
              • <strong>Reserved Stock:</strong> Units already cross-matched or assigned to active inpatients.
            </p>
            <p className="text-[11px] leading-relaxed text-stone-600">
              • <strong>Estimated Protection Requirement:</strong> Projected local demand under high-demand scenarios plus a minimum local safety buffer (5 units). This guarantees that a facility never shares blood that could trigger a local shortage.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
