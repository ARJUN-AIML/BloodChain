import { useMemo } from 'react';
import { Package, Clock, AlertTriangle, Truck, ArrowUpRight, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn, formatBloodGroup } from '@/lib/utils';
import {
  DEMO_SUMMARY, DEMO_SHORTAGES, DEMO_DEMAND_TREND,
  DEMO_ORGANIZATIONS, DEMO_TRANSFERS, DEMO_BLOOD_GROUP_DISTRIBUTION,
} from '@/lib/demo-data';

const BLOOD_COLORS = ['#C85A3F', '#5B8C7A', '#D99B38', '#5C768D', '#8C5B7A', '#5B7A8C', '#B24930', '#477262'];

// Custom Conversational Tooltip with Variance calculation
const CustomDemandTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const actual = payload.find((p: any) => p.dataKey === 'actual')?.value;
    const forecast = payload.find((p: any) => p.dataKey === 'forecast')?.value;
    const variance = (actual !== undefined && forecast !== undefined) ? actual - forecast : null;
    const varSign = variance !== null && variance > 0 ? `+${variance}` : `${variance}`;

    return (
      <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-lg p-3 shadow-soft text-xs space-y-1">
        <p className="font-bold text-[#1A1F26] border-b border-[#E2E2DC] pb-1 font-mono">{label}</p>
        <div className="flex items-center gap-2 pt-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5B8C7A]" />
          <span className="text-[#64748B]">Actual Demand:</span>
          <span className="font-bold text-[#1A1F26] ml-auto">{actual} Units</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C85A3F]" />
          <span className="text-[#64748B]">AI Forecast:</span>
          <span className="font-bold text-[#1A1F26] ml-auto">{forecast} Units</span>
        </div>
        {variance !== null && (
          <div className="flex items-center gap-2 pt-1 border-t border-[#E2E2DC]/50 mt-1 text-[11px]">
            <span className="text-[#64748B]">Variance:</span>
            <span className={cn('font-bold ml-auto font-mono', variance >= 0 ? 'text-[#5B8C7A]' : 'text-[#C85A3F]')}>
              {varSign} Units ({variance >= 0 ? `+${((variance / forecast) * 100).toFixed(1)}%` : `${((variance / forecast) * 100).toFixed(1)}%`})
            </span>
          </div>
        )}
      </div>
    );
  };
  return null;
};

export function RegionalCommandCenter() {
  const summary = DEMO_SUMMARY;
  const shortages = DEMO_SHORTAGES;
  const demandTrend = DEMO_DEMAND_TREND;
  const facilities = DEMO_ORGANIZATIONS.filter(o => o.type === 'HOSPITAL' || o.type === 'BLOOD_BANK');
  const activeTransfers = DEMO_TRANSFERS.filter(t => t.status === 'IN_TRANSIT' || t.status === 'PREPARING');

  const totalDistUnits = useMemo(() => DEMO_BLOOD_GROUP_DISTRIBUTION.reduce((acc, curr) => acc + curr.value, 0), []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E2DC]">
        <div>
          <h2 className="text-xl font-bold text-[#1A1F26] tracking-tight">Regional Command Center</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Network-wide inventory monitoring, forecast trends, and emergency dispatch tracking
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
          <span className="px-2.5 py-1 rounded-md bg-[#FFFFFF] border border-[#E2E2DC] shadow-flat">
            Region: <span className="font-bold text-[#1A1F26]">Metropolis North & Central</span>
          </span>
        </div>
      </div>

      {/* Top 4 Compact Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Network Inventory */}
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#E3EFEA] border border-[#5B8C7A]/20 flex items-center justify-center text-[#5B8C7A]">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#64748B]">Network Inventory</p>
            <p className="text-2xl font-bold text-[#1A1F26] tracking-tight font-mono">{summary.totalUsableInventory.toLocaleString()} <span className="text-xs font-normal text-[#64748B]">units</span></p>
          </div>
        </div>

        {/* Card 2: Reserved Units */}
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#E4EBF0] border border-[#5C768D]/20 flex items-center justify-center text-[#5C768D]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#64748B]">Reserved Units</p>
            <p className="text-2xl font-bold text-[#1A1F26] tracking-tight font-mono">{summary.totalReservedUnits} <span className="text-xs font-normal text-[#64748B]">units</span></p>
          </div>
        </div>

        {/* Card 3: Near Expiry */}
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#FAF0D6] border border-[#D99B38]/20 flex items-center justify-center text-[#D99B38]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#64748B]">Near Expiry (&lt;72h)</p>
            <p className="text-2xl font-bold text-[#1A1F26] tracking-tight font-mono">{summary.totalNearExpiryUnits} <span className="text-xs font-normal text-[#64748B]">units</span></p>
          </div>
        </div>

        {/* Card 4: Active Transfers */}
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#FDF6F0] border border-[#C85A3F]/20 flex items-center justify-center text-[#C85A3F]">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#64748B]">Active Transfers</p>
            <p className="text-2xl font-bold text-[#1A1F26] tracking-tight font-mono">{activeTransfers.length} <span className="text-xs font-normal text-[#64748B]">transits</span></p>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Shortage Alerts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Demand vs Forecast Chart (2 cols) */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#E2E2DC]">
            <div>
              <h3 className="text-sm font-bold text-[#1A1F26]">14-Day Demand vs. AI Forecast</h3>
              <p className="text-[11px] text-[#64748B]">Comparing actual aggregate daily demand against XGBoost prediction</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#5B8C7A]" />
                <span className="text-[#64748B]">Actual Demand</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-[#C85A3F]" />
                <span className="text-[#64748B]">AI Forecast</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={demandTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B8C7A" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#5B8C7A" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="rustGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C85A3F" stopOpacity={0.10} />
                    <stop offset="95%" stopColor="#C85A3F" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E2DC" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} stroke="#E2E2DC" />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} stroke="#E2E2DC" domain={[0, 'dataMax + 20']} />
                <Tooltip content={<CustomDemandTooltip />} />
                <Area type="monotone" dataKey="actual" stroke="#5B8C7A" strokeWidth={2.5} fill="url(#sageGrad)" name="Actual Demand" />
                <Area type="monotone" dataKey="forecast" stroke="#C85A3F" strokeWidth={2} strokeDasharray="5 5" fill="url(#rustGrad)" name="AI Forecast" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Shortage Alerts Cards (1 col) */}
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E2DC] mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#C85A3F]" />
              <h3 className="text-sm font-bold text-[#1A1F26]">Active Shortage Alerts</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#FDF6F0] text-[#C85A3F] text-[10px] font-bold border border-[#F1D6C5]">
              {shortages.length} Actionable
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
            {shortages.map(s => {
              const bgFormat = formatBloodGroup(s.bloodGroup);
              const isCritical = s.severity === 'CRITICAL';
              const isHigh = s.severity === 'HIGH';

              return (
                <div
                  key={s.id}
                  className={cn(
                    'p-3 rounded-lg border text-xs transition-colors',
                    isCritical
                      ? 'bg-[#FDF6F0] border-[#F1D6C5]'
                      : isHigh
                      ? 'bg-[#FAF0D6]/40 border-[#FAF0D6]'
                      : 'bg-[#F7F7F5] border-[#E2E2DC]'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
                      isCritical ? 'bg-[#C85A3F] text-[#FFFFFF]' :
                      isHigh ? 'bg-[#B24930] text-[#FFFFFF]' : 'bg-[#D99B38] text-[#FFFFFF]'
                    )}>
                      {s.severity}
                    </span>
                    <span className="font-bold text-[#1A1F26]">{bgFormat} • {s.componentType}</span>
                  </div>
                  <p className="font-semibold text-[#1A1F26] text-[11px]">{s.organizationName}</p>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-[#64748B]">
                    <span>Deficit: <strong className="text-[#C85A3F]">{s.projectedDeficit} units</strong></span>
                    <span>Coverage: <strong className="text-[#1A1F26]">{(s.coverageRatio * 100).toFixed(0)}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Secondary Grid: Facilities Network & Blood Group Donut */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Facilities Network Status List (2 cols) */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E2DC] mb-3">
            <h3 className="text-sm font-bold text-[#1A1F26]">Regional Facility Network</h3>
            <span className="text-xs text-[#64748B]">{facilities.length} active nodes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#64748B] border-b border-[#E2E2DC]">
                  <th className="pb-2 font-medium">Facility Name</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Region</th>
                  <th className="pb-2 font-medium text-right">Available</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E2DC]">
                {facilities.map(f => (
                  <tr key={f.id} className="hover:bg-[#F7F7F5] transition-colors">
                    <td className="py-2.5 font-semibold text-[#1A1F26]">{f.name}</td>
                    <td className="py-2.5 text-[#64748B] uppercase text-[10px] tracking-wider">{f.type}</td>
                    <td className="py-2.5 text-[#64748B]">
                      <span className="px-2 py-0.5 rounded bg-[#F4F4F0] border border-[#E2E2DC] text-[10px] font-medium">
                        {f.region}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-[#1A1F26]">{f.availableUnits || 180}</td>
                    <td className="py-2.5 text-right">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                        f.hasDeficit ? 'bg-[#FDF6F0] text-[#C85A3F] border border-[#F1D6C5]' : 'bg-[#E3EFEA] text-[#5B8C7A]'
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', f.hasDeficit ? 'bg-[#C85A3F]' : 'bg-[#5B8C7A]')} />
                        {f.hasDeficit ? 'Deficit' : 'Optimal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Blood Group Distribution Donut (1 col) */}
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat flex flex-col justify-between">
          <div className="pb-2 border-b border-[#E2E2DC] mb-2">
            <h3 className="text-sm font-bold text-[#1A1F26]">Blood Group Distribution</h3>
            <p className="text-[11px] text-[#64748B]">Inventory mix across all facilities</p>
          </div>

          <div className="h-44 w-full relative my-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DEMO_BLOOD_GROUP_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {DEMO_BLOOD_GROUP_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BLOOD_COLORS[index % BLOOD_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} units (${((value / totalDistUnits) * 100).toFixed(1)}%)`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#E2E2DC] text-[11px]">
            {DEMO_BLOOD_GROUP_DISTRIBUTION.map((bg, idx) => (
              <div key={bg.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: BLOOD_COLORS[idx % BLOOD_COLORS.length] }} />
                <span className="text-[#64748B] font-medium">{bg.name}:</span>
                <span className="font-bold text-[#1A1F26] ml-auto font-mono">{((bg.value / totalDistUnits) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
