import { FileText, Zap } from 'lucide-react';
import { cn, formatBloodGroup } from '@/lib/utils';
import { DEMO_REQUESTS, DEMO_ALLOCATION } from '@/lib/demo-data';

export function RequestsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E2DC]">
        <div>
          <h2 className="text-xl font-bold text-[#1A1F26] tracking-tight">Emergency Requests & Allocation Engine</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Google OR-Tools multi-source optimization solver for instant blood redistribution
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Requests List */}
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat">
          <div className="pb-3 border-b border-[#E2E2DC] mb-3">
            <h3 className="text-sm font-bold text-[#1A1F26]">Active Blood Requests</h3>
          </div>

          <div className="space-y-3">
            {DEMO_REQUESTS.map(r => (
              <div key={r.id} className="p-3 rounded-lg border border-[#E2E2DC] bg-[#F7F7F5] text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-[#1A1F26]">{r.id}</span>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase',
                    r.priority === 'EMERGENCY' ? 'bg-[#C85A3F] text-[#FFFFFF]' : 'bg-[#D99B38] text-[#FFFFFF]'
                  )}>
                    {r.priority}
                  </span>
                </div>
                <p className="font-bold text-[#1A1F26] mt-1">{r.organizationName}</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {formatBloodGroup(r.bloodGroup)} {r.componentType} • <strong className="text-[#1A1F26]">{r.unitsNeeded} units needed</strong>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* OR Tools Solver Allocation Result */}
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E2DC] mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#D99B38]" />
              <h3 className="text-sm font-bold text-[#1A1F26]">OR-Tools Solver Recommendation</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#E3EFEA] text-[#5B8C7A] text-[10px] font-bold">
              OPTIMAL SOLVED
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="p-3 rounded-lg bg-[#F7F7F5] border border-[#E2E2DC]">
              <p className="text-xl font-bold text-[#5B8C7A] font-mono">{DEMO_ALLOCATION.totalAllocated}</p>
              <p className="text-[10px] text-[#64748B]">Units Allocated</p>
            </div>
            <div className="p-3 rounded-lg bg-[#F7F7F5] border border-[#E2E2DC]">
              <p className="text-xl font-bold text-[#1A1F26] font-mono">{DEMO_ALLOCATION.totalNeeded}</p>
              <p className="text-[10px] text-[#64748B]">Units Needed</p>
            </div>
            <div className="p-3 rounded-lg bg-[#F7F7F5] border border-[#E2E2DC]">
              <p className="text-xl font-bold text-[#5C768D] font-mono">{DEMO_ALLOCATION.solverRuntimeMs}ms</p>
              <p className="text-[10px] text-[#64748B]">Solver Time</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {DEMO_ALLOCATION.allocations.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-[#E2E2DC] bg-[#F7F7F5] text-xs">
                <div>
                  <p className="font-bold text-[#1A1F26]">#{a.rank} {a.sourceName}</p>
                  <p className="text-[10px] text-[#64748B]">ETA: {a.etaMinutes} min • {a.distanceKm} km</p>
                </div>
                <span className="text-base font-bold text-[#5B8C7A] font-mono">{a.unitsAllocated} units</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[#64748B] mt-3 leading-relaxed">{DEMO_ALLOCATION.explanation}</p>
        </div>
      </div>
    </div>
  );
}
