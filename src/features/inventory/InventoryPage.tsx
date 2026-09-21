import { useState } from 'react';
import { Package, Filter, Building2, AlertCircle } from 'lucide-react';
import { cn, formatBloodGroup, COMPONENT_LABELS } from '@/lib/utils';
import { DEMO_ORGANIZATIONS, DEMO_INVENTORY } from '@/lib/demo-data';
import type { BloodGroup, ComponentType } from '@/types';

const BLOOD_GROUPS: BloodGroup[] = [
  'O_POSITIVE', 'O_NEGATIVE', 'A_POSITIVE', 'A_NEGATIVE',
  'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE'
];

const COMPONENTS: ComponentType[] = ['RBC', 'PLASMA', 'PLATELETS', 'WHOLE_BLOOD'];

export function InventoryPage() {
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [bgFilter, setBgFilter] = useState('ALL');

  const orgs = DEMO_ORGANIZATIONS.filter(o => o.type === 'HOSPITAL' || o.type === 'BLOOD_BANK');

  const filtered = DEMO_INVENTORY.filter(i => {
    if (orgFilter !== 'ALL' && i.organizationId !== orgFilter) return false;
    if (bgFilter !== 'ALL' && i.bloodGroup !== bgFilter) return false;
    return true;
  });

  const totalAvail = filtered.reduce((s, i) => s + i.availableUnits, 0);
  const totalReserved = filtered.reduce((s, i) => s + i.reservedUnits, 0);
  const totalNearExp = filtered.reduce((s, i) => s + i.nearExpiryUnits, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#841A2B]">
              Inventory Overview
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-stone-500 font-medium">Demonstration Data</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Blood Stock Overview
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Regional stock counts, patient reservations, and units approaching expiration across all facilities.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium self-start sm:self-auto">
          <AlertCircle className="w-3.5 h-3.5 text-[#841A2B]" />
          <span>Synthetic data — not live availability</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-white border border-stone-200 shadow-2xs">
        <Filter className="w-4 h-4 text-stone-400" />
        <select
          value={orgFilter}
          onChange={e => setOrgFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs font-medium text-stone-900 focus:bg-white focus:outline-none"
        >
          <option value="ALL">All Regional Facilities</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select
          value={bgFilter}
          onChange={e => setBgFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs font-medium text-stone-900 focus:bg-white focus:outline-none"
        >
          <option value="ALL">All Blood Groups</option>
          {BLOOD_GROUPS.map(b => <option key={b} value={b}>{formatBloodGroup(b)}</option>)}
        </select>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-semibold text-stone-400 block">Usable Units (Ready for Use)</span>
          <p className="text-3xl font-bold font-serif text-stone-900">{totalAvail.toLocaleString()}</p>
          <p className="text-[11px] text-stone-500">Unreserved units currently available in cold storage.</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-semibold text-stone-400 block">Reserved for Patients</span>
          <p className="text-3xl font-bold font-serif text-stone-700">{totalReserved.toLocaleString()}</p>
          <p className="text-[11px] text-stone-500">Cross-matched or assigned to active surgical cases.</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-semibold text-stone-400 block">Expiring Soon (&lt; 48 hrs)</span>
          <p className="text-3xl font-bold font-serif text-[#841A2B]">{totalNearExp.toLocaleString()}</p>
          <p className="text-[11px] text-stone-500">Flagged for FEFO stock rotation rebalancing.</p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
            Current Facility Inventory Records
          </h3>
          <span className="text-xs text-stone-400 font-mono">
            {filtered.length} records displayed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50/80 text-stone-500 text-[10px] uppercase font-semibold border-b border-stone-200">
                <th className="py-2.5 px-4">Facility</th>
                <th className="py-2.5 px-4">Blood Group</th>
                <th className="py-2.5 px-4">Component</th>
                <th className="py-2.5 px-4 text-center">Usable Units</th>
                <th className="py-2.5 px-4 text-center">Reserved</th>
                <th className="py-2.5 px-4 text-center">Expiring Soon</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {filtered.slice(0, 16).map((inv, idx) => {
                const org = orgs.find(o => o.id === inv.organizationId);
                const isShortage = inv.availableUnits < inv.safetyStockTarget;

                return (
                  <tr key={`${inv.organizationId}-${inv.bloodGroup}-${inv.componentType}-${idx}`} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-stone-900">{org?.name || inv.organizationId}</td>
                    <td className="py-3 px-4 font-bold">{formatBloodGroup(inv.bloodGroup)}</td>
                    <td className="py-3 px-4 text-stone-600">{COMPONENT_LABELS[inv.componentType]}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-stone-900">{inv.availableUnits}</td>
                    <td className="py-3 px-4 text-center font-mono text-stone-600">{inv.reservedUnits}</td>
                    <td className="py-3 px-4 text-center font-mono text-[#841A2B]">{inv.nearExpiryUnits}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                        isShortage
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      )}>
                        {isShortage ? 'Below Buffer' : 'Adequate'}
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
