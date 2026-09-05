import { useState } from 'react';
import { Package, Filter } from 'lucide-react';
import { cn, formatBloodGroup, COMPONENT_LABELS } from '@/lib/utils';
import { DEMO_ORGANIZATIONS, DEMO_INVENTORY } from '@/lib/demo-data';
import type { BloodGroup, ComponentType } from '@/types';

const BLOOD_GROUPS: BloodGroup[] = ['O_POSITIVE','A_POSITIVE','B_POSITIVE','AB_POSITIVE','O_NEGATIVE','A_NEGATIVE','B_NEGATIVE','AB_NEGATIVE'];
const COMPONENTS: ComponentType[] = ['RBC','PLASMA','PLATELETS','WHOLE_BLOOD'];

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E2DC]">
        <div>
          <h2 className="text-xl font-bold text-[#1A1F26] tracking-tight">Regional Inventory Matrix</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Unit stock counts, safety reserves, and expiration tracking across all facilities
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-[#FFFFFF] border border-[#E2E2DC] shadow-flat">
        <Filter className="w-4 h-4 text-[#64748B]" />
        <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-[#E2E2DC] bg-[#F7F7F5] text-xs font-semibold text-[#1A1F26] focus:outline-none">
          <option value="ALL">All Facilities</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={bgFilter} onChange={e => setBgFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-[#E2E2DC] bg-[#F7F7F5] text-xs font-semibold text-[#1A1F26] focus:outline-none">
          <option value="ALL">All Blood Groups</option>
          {BLOOD_GROUPS.map(b => <option key={b} value={b}>{formatBloodGroup(b)}</option>)}
        </select>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat text-center">
          <p className="text-2xl font-bold text-[#5B8C7A] font-mono">{totalAvail.toLocaleString()}</p>
          <p className="text-xs text-[#64748B] mt-0.5">Total Available</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat text-center">
          <p className="text-2xl font-bold text-[#5C768D] font-mono">{totalReserved}</p>
          <p className="text-xs text-[#64748B] mt-0.5">Reserved</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat text-center">
          <p className="text-2xl font-bold text-[#D99B38] font-mono">{totalNearExp}</p>
          <p className="text-xs text-[#64748B] mt-0.5">Near Expiry (&lt;72h)</p>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat">
        <div className="pb-3 border-b border-[#E2E2DC] mb-3">
          <h3 className="text-sm font-bold text-[#1A1F26]">Inventory Records ({filtered.length} items)</h3>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#FFFFFF]">
              <tr className="text-left text-[#64748B] border-b border-[#E2E2DC]">
                <th className="pb-2 font-medium">Facility</th>
                <th className="pb-2 font-medium">Blood Group</th>
                <th className="pb-2 font-medium">Component</th>
                <th className="pb-2 font-medium text-right">Available</th>
                <th className="pb-2 font-medium text-right">Reserved</th>
                <th className="pb-2 font-medium text-right">Near Expiry</th>
                <th className="pb-2 font-medium text-right">Safety Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E2DC]">
              {filtered.slice(0, 100).map((inv, idx) => {
                const orgName = orgs.find(o => o.id === inv.organizationId)?.name || inv.organizationId;
                return (
                  <tr key={idx} className="hover:bg-[#F7F7F5] transition-colors">
                    <td className="py-2.5 font-semibold text-[#1A1F26]">{orgName}</td>
                    <td className="py-2.5 font-bold text-[#C85A3F]">{formatBloodGroup(inv.bloodGroup)}</td>
                    <td className="py-2.5 text-[#1A1F26]">{COMPONENT_LABELS[inv.componentType]}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-[#5B8C7A]">{inv.availableUnits}</td>
                    <td className="py-2.5 text-right font-mono text-[#5C768D]">{inv.reservedUnits}</td>
                    <td className="py-2.5 text-right font-mono text-[#D99B38]">{inv.nearExpiryUnits}</td>
                    <td className="py-2.5 text-right font-mono text-[#64748B]">{inv.safetyStockTarget}</td>
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
