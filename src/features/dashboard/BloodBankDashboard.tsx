import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, CheckCircle, Clock, ShieldCheck, PieChart as PieIcon, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { cn, formatBloodGroup, COMPONENT_LABELS } from '@/lib/utils';
import { DEMO_ORGANIZATIONS, DEMO_SAFE_SHARE, DEMO_INVENTORY_BATCHES } from '@/lib/demo-data';
import { useAuthStore } from '@/lib/auth-store';

export function BloodBankDashboard() {
  const { currentUser } = useAuthStore();
  const bloodBanks = DEMO_ORGANIZATIONS.filter(o => o.type === 'BLOOD_BANK');

  // Match user organization or fallback to central hub
  const userBank = bloodBanks.find(b => b.id === currentUser.organizationId);
  const [selectedBankId, setSelectedBankId] = useState(userBank?.id || 'SIM_BB_TRY_CENTRAL');

  useEffect(() => {
    if (userBank) {
      setSelectedBankId(userBank.id);
    }
  }, [currentUser.organizationId]);

  const currentBank = bloodBanks.find(b => b.id === selectedBankId) || bloodBanks[0];
  const safeShares = DEMO_SAFE_SHARE.filter(s => s.organizationId === currentBank.id);
  const batches = DEMO_INVENTORY_BATCHES.filter(b => b.organizationId === currentBank.id);

  const pipeline = [
    { stage: 'Collected Today', count: 42, icon: Droplets, color: 'text-[#841A2B]', bg: 'bg-[#FDF2F4]' },
    { stage: 'Under Testing', count: 18, icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50' },
    { stage: 'Component Separation', count: 14, icon: PieIcon, color: 'text-stone-700', bg: 'bg-stone-100' },
    { stage: 'Cleared Available', count: 280, icon: ShieldCheck, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif font-bold text-stone-900 tracking-tight">{currentBank.name}</h1>
            <span className="text-[11px] font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
              Blood Bank Hub
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Regional collection, component processing, batch tracking, and Safe-to-Share calculation hub.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/expiry-rescue"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors border border-stone-200"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Stock Rotation Plan
          </Link>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-500 font-medium">Hub:</span>
            <select
              value={selectedBankId}
              onChange={e => setSelectedBankId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-900 focus:outline-none"
            >
              {bloodBanks.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Safety Invariant Notice */}
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs text-stone-600 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-stone-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-stone-800">Operational Safeguards & Human Verification</p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Blood is never automatically discarded or transferred. All inventory movements, quarantine releases, and redistribution dispatches require explicit staff authorization and recorded verification.
          </p>
        </div>
      </div>

      {/* Processing Pipeline 4 Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {pipeline.map((p, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center border border-stone-200', p.bg, p.color)}>
              <p.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-stone-500">{p.stage}</p>
              <p className="text-2xl font-bold text-stone-900 font-mono">{p.count} <span className="text-xs font-normal text-stone-400">units</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Batch-Level Inventory (FEFO Overview) */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Batch-Level Physical Inventory</h2>
            <p className="text-[11px] text-stone-500">Sorted by expiry date using First Expire, First Out (FEFO) guidance</p>
          </div>
          <Link to="/inventory" className="text-xs font-semibold text-[#841A2B] hover:underline flex items-center gap-1">
            Full Inventory <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-stone-500 border-b border-stone-200">
                <th className="pb-2 font-medium">Batch Number (ISBT-128)</th>
                <th className="pb-2 font-medium">Blood Group</th>
                <th className="pb-2 font-medium">Component</th>
                <th className="pb-2 font-medium">Storage Location</th>
                <th className="pb-2 font-medium text-right">Expiry Date</th>
                <th className="pb-2 font-medium text-right">Days Left</th>
                <th className="pb-2 font-medium text-right">Available Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="py-2.5 font-mono font-bold text-stone-900">{b.batchNumber}</td>
                  <td className="py-2.5 font-bold text-stone-900">{formatBloodGroup(b.bloodGroup)}</td>
                  <td className="py-2.5 text-stone-600">{COMPONENT_LABELS[b.componentType]}</td>
                  <td className="py-2.5 text-stone-500">{b.storageLocation}</td>
                  <td className="py-2.5 text-right font-mono text-stone-700">{b.expiryDate}</td>
                  <td className="py-2.5 text-right font-mono">
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[11px] font-bold',
                      b.daysToExpiry <= 7 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'text-stone-700'
                    )}>
                      {b.daysToExpiry} days
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-emerald-700">{b.quantity} units</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safe to Share Matrix */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Blood Available for Sharing</h2>
            <p className="text-[11px] text-stone-500">Calculated surplus after reserving local safety buffer for {currentBank.name}</p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
            Safe-to-Share Algorithm Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-stone-500 border-b border-stone-200">
                <th className="pb-2 font-medium">Blood Group</th>
                <th className="pb-2 font-medium">Component</th>
                <th className="pb-2 font-medium text-right">Usable Stock</th>
                <th className="pb-2 font-medium text-right">Predicted Demand</th>
                <th className="pb-2 font-medium text-right">Safety Reserve</th>
                <th className="pb-2 font-medium text-right">Available for Sharing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {safeShares.map((s, idx) => (
                <tr key={idx} className="hover:bg-stone-50/60 transition-colors">
                  <td className="py-2.5 font-bold text-stone-900">{formatBloodGroup(s.bloodGroup)}</td>
                  <td className="py-2.5 text-stone-600">{COMPONENT_LABELS[s.componentType as keyof typeof COMPONENT_LABELS] || s.componentType}</td>
                  <td className="py-2.5 text-right font-mono text-stone-900">{s.usableInventory}</td>
                  <td className="py-2.5 text-right font-mono text-stone-500">{s.predictedLocalDemand}</td>
                  <td className="py-2.5 text-right font-mono text-stone-500">{s.safetyReserve}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-emerald-700">{s.safeShareUnits} units</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
