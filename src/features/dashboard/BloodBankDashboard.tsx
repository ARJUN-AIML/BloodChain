import { useState } from 'react';
import { Droplets, CheckCircle, Clock, ShieldCheck, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn, formatBloodGroup } from '@/lib/utils';
import { DEMO_ORGANIZATIONS, DEMO_SAFE_SHARE } from '@/lib/demo-data';

const COLORS = ['#C85A3F', '#5B8C7A', '#D99B38', '#5C768D'];

export function BloodBankDashboard() {
  const bloodBanks = DEMO_ORGANIZATIONS.filter(o => o.type === 'BLOOD_BANK');
  const [selectedBankId, setSelectedBankId] = useState('BANK_ALPHA');
  const currentBank = bloodBanks.find(b => b.id === selectedBankId) || bloodBanks[0];

  const safeShares = DEMO_SAFE_SHARE.filter(s => s.organizationId === selectedBankId);

  const pipeline = [
    { stage: 'Collected Today', count: 42, icon: Droplets, color: 'text-[#C85A3F]', bg: 'bg-[#FDF6F0]' },
    { stage: 'Under Testing', count: 18, icon: Clock, color: 'text-[#D99B38]', bg: 'bg-[#FAF0D6]' },
    { stage: 'Component Separation', count: 14, icon: PieIcon, color: 'text-[#5C768D]', bg: 'bg-[#E4EBF0]' },
    { stage: 'Cleared Available', count: 280, icon: ShieldCheck, color: 'text-[#5B8C7A]', bg: 'bg-[#E3EFEA]' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E2DC]">
        <div>
          <h2 className="text-xl font-bold text-[#1A1F26] tracking-tight">{currentBank.name}</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Regional blood collection & safe-to-share component processing hub
          </p>
        </div>

        <select
          value={selectedBankId}
          onChange={e => setSelectedBankId(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-[#E2E2DC] bg-[#FFFFFF] text-xs font-semibold text-[#1A1F26] focus:outline-none"
        >
          {bloodBanks.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Processing Pipeline 4 Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {pipeline.map((p, i) => (
          <div key={i} className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat flex items-center gap-3.5">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center border border-[#E2E2DC]', p.bg, p.color)}>
              <p.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#64748B]">{p.stage}</p>
              <p className="text-2xl font-bold text-[#1A1F26] font-mono">{p.count} <span className="text-xs font-normal text-[#64748B]">units</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Safe to Share Matrix */}
      <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E2DC] mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#1A1F26]">Safe-to-Share Inventory Surplus</h3>
            <p className="text-[11px] text-[#64748B]">Units available for regional redistribution after reserving local safety buffer</p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#E3EFEA] text-[#5B8C7A] text-[10px] font-bold">
            Deterministic Engine Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[#64748B] border-b border-[#E2E2DC]">
                <th className="pb-2 font-medium">Blood Group</th>
                <th className="pb-2 font-medium">Component</th>
                <th className="pb-2 font-medium text-right">Usable Inventory</th>
                <th className="pb-2 font-medium text-right">Local Demand Est.</th>
                <th className="pb-2 font-medium text-right">Safety Buffer</th>
                <th className="pb-2 font-medium text-right">Safe Share Surplus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E2DC]">
              {safeShares.map((s, idx) => (
                <tr key={idx} className="hover:bg-[#F7F7F5] transition-colors">
                  <td className="py-2.5 font-bold text-[#C85A3F]">{formatBloodGroup(s.bloodGroup)}</td>
                  <td className="py-2.5 text-[#1A1F26]">{s.componentType}</td>
                  <td className="py-2.5 text-right font-mono text-[#1A1F26]">{s.usableInventory}</td>
                  <td className="py-2.5 text-right font-mono text-[#64748B]">{s.predictedLocalDemand}</td>
                  <td className="py-2.5 text-right font-mono text-[#5C768D]">{s.safetyReserve}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-[#5B8C7A]">{s.safeShareUnits} units</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
