import { useState } from 'react';
import {
  ShieldCheck, AlertTriangle, ArrowRight, Info, HelpCircle,
  TrendingUp, CheckCircle2, Lock, Sparkles, Building2, Droplet,
} from 'lucide-react';
import { DEMO_ORGANIZATIONS, DEMO_INVENTORY, generateDemoForecasts } from '@/lib/demo-data';
import { calculateSafeToShare } from '@/lib/safe-to-share';
import type { BloodGroup, ComponentType } from '@/types';

export function SafeToShareDashboard() {
  const [selectedOrgId, setSelectedOrgId] = useState<string>('ALL');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('O_POSITIVE');
  const [selectedComponent, setSelectedComponent] = useState<ComponentType>('RBC');

  const forecasts = generateDemoForecasts();
  const bloodOrgs = DEMO_ORGANIZATIONS.filter(o => o.type === 'HOSPITAL' || o.type === 'BLOOD_BANK');

  // Compute Safe-to-Share calculations for all facilities
  const safeToShareItems = DEMO_INVENTORY.filter(inv => {
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

  const totalShareable = safeToShareItems.reduce((acc, curr) => acc + curr.safeToShareUnits, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#1A1F26] to-[#2D343F] text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#4E9F3D]" />
            <h2 className="text-xl font-bold tracking-tight">SAFE-TO-SHARE Engine</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4E9F3D]/20 text-[#68D391] border border-[#4E9F3D]/30 uppercase tracking-wider">
              Core USP
            </span>
          </div>
          <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
            Quantifies local demand uncertainty (P90) and active patient reservations to protect local facility safety <strong className="text-white">before</strong> calculating shareable inventory for network redistribution.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 p-3.5 rounded-xl border border-white/10 backdrop-blur-sm">
          <div className="text-right">
            <p className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Total Shareable Units</p>
            <p className="text-2xl font-bold text-[#68D391]">{totalShareable} Units</p>
          </div>
        </div>
      </div>

      {/* Formula Explanation Card */}
      <div className="p-5 rounded-xl bg-white border border-[#E2E2DC] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E2DC] pb-3">
          <h3 className="text-sm font-bold text-[#1A1F26] flex items-center gap-2">
            <Info className="w-4 h-4 text-[#C85A3F]" />
            Uncertainty-Aware Safe-to-Share Mathematical Model
          </h3>
          <span className="text-[11px] font-mono text-[#64748B]">Decision Support Guarantee</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E2E2DC] space-y-1.5">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">1. Local Protection Level</span>
            <div className="p-2 rounded bg-white font-mono text-[11px] border border-[#E2E2DC] text-[#1A1F26] font-semibold">
              Protection = P90 Forecast + Safety Buffer
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Uses upper quantile demand (P90) to ensure the facility withstands unexpected 90th-percentile demand spikes.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E2E2DC] space-y-1.5">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">2. Patient Reservations</span>
            <div className="p-2 rounded bg-white font-mono text-[11px] border border-[#E2E2DC] text-[#1A1F26] font-semibold">
              Net Usable = Current Stock - Reserved
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Committed units for scheduled surgeries, trauma patients, or active crossmatches are strictly locked.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#FDF6F0] border border-[#F3D7C8] space-y-1.5">
            <span className="text-[10px] font-bold text-[#C85A3F] uppercase tracking-wider">3. Safe-to-Share Result</span>
            <div className="p-2 rounded bg-white font-mono text-[11px] border border-[#F3D7C8] text-[#C85A3F] font-bold">
              Safe-to-Share = MAX(0, Net Usable - Protection)
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Only genuine surplus above protection levels is offered to neighboring facilities.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#E2E2DC]">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">Facility Filter</label>
            <select
              value={selectedOrgId}
              onChange={e => setSelectedOrgId(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E2DC] bg-[#FAF9F6] font-medium text-[#1A1F26]"
            >
              <option value="ALL">All Network Facilities</option>
              {bloodOrgs.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">Blood Group</label>
            <select
              value={selectedBloodGroup}
              onChange={e => setSelectedBloodGroup(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E2DC] bg-[#FAF9F6] font-medium text-[#1A1F26]"
            >
              <option value="O_POSITIVE">O+ (O Positive)</option>
              <option value="O_NEGATIVE">O- (O Negative)</option>
              <option value="A_POSITIVE">A+ (A Positive)</option>
              <option value="A_NEGATIVE">A- (A Negative)</option>
              <option value="B_POSITIVE">B+ (B Positive)</option>
              <option value="B_NEGATIVE">B- (B Negative)</option>
              <option value="AB_POSITIVE">AB+ (AB Positive)</option>
              <option value="AB_NEGATIVE">AB- (AB Negative)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">Component</label>
            <select
              value={selectedComponent}
              onChange={e => setSelectedComponent(e.target.value as ComponentType)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E2DC] bg-[#FAF9F6] font-medium text-[#1A1F26]"
            >
              <option value="RBC">RBC (Red Blood Cells)</option>
              <option value="PLASMA">Plasma</option>
              <option value="PLATELETS">Platelets</option>
              <option value="WHOLE_BLOOD">Whole Blood</option>
            </select>
          </div>
        </div>
      </div>

      {/* Detailed Facility Calculation Table */}
      <div className="rounded-xl border border-[#E2E2DC] bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[#E2E2DC] bg-[#FAF9F6] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#1A1F26]">
            Facility Safe-to-Share Calculations ({selectedBloodGroup.replace('_', ' ')} {selectedComponent})
          </h3>
          <span className="text-[10px] font-mono text-[#64748B]">Updated Live from Inventory & AI Forecast</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F4F4F0] border-b border-[#E2E2DC] text-[10px] font-bold uppercase text-[#64748B]">
                <th className="py-3 px-4">Facility</th>
                <th className="py-3 px-3 text-center">Current Stock</th>
                <th className="py-3 px-3 text-center text-[#C85A3F]">Reserved</th>
                <th className="py-3 px-3 text-center text-[#2C6E49]">Net Usable</th>
                <th className="py-3 px-3 text-center font-mono">P50 Forecast</th>
                <th className="py-3 px-3 text-center font-mono text-[#BE8226]">P90 Demand</th>
                <th className="py-3 px-3 text-center font-mono">Buffer</th>
                <th className="py-3 px-3 text-center font-bold text-[#1A1F26]">Protection Level</th>
                <th className="py-3 px-4 text-center font-bold text-[#4E9F3D]">Safe-to-Share</th>
                <th className="py-3 px-4">Status Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E2DC]">
              {safeToShareItems.map(item => {
                const netUsable = item.currentInventory - item.reservedStock;
                return (
                  <tr key={item.organizationId} className="hover:bg-[#FAF9F6] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#1A1F26]">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#64748B]" />
                        <span>{item.organizationName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-[#1A1F26]">
                      {item.currentInventory}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[#C85A3F] font-semibold">
                      {item.reservedStock}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[#2C6E49] font-bold">
                      {netUsable}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[#64748B]">
                      {item.p50Demand}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[#BE8226] font-bold">
                      {item.p90Demand}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[#64748B]">
                      +{item.safetyBuffer}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-[#1A1F26] bg-[#FAF9F6]">
                      {item.protectionLevel}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {item.isSafeToShare ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#E3EFEA] text-[#2C6E49] border border-[#C5E1D4]">
                          {item.safeToShareUnits} Units
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FAF0D6] text-[#BE8226] border border-[#EAEAE5]">
                          0 (Protected)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#64748B] leading-snug max-w-xs">
                      {item.explanation}
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
