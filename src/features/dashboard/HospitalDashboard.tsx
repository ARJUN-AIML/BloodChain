import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Package, AlertTriangle, TrendingUp, Clock, Droplets, PlusCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, formatBloodGroup, COMPONENT_LABELS } from '@/lib/utils';
import { DEMO_ORGANIZATIONS, DEMO_INVENTORY, DEMO_REQUESTS } from '@/lib/demo-data';
import { useAuthStore } from '@/lib/auth-store';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const actual = payload.find((p: any) => p.dataKey === 'actual')?.value;
    const forecast = payload.find((p: any) => p.dataKey === 'forecast')?.value;
    const variance = (actual !== undefined && forecast !== undefined) ? actual - forecast : null;

    return (
      <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-md text-xs space-y-1">
        <p className="font-bold text-stone-900 border-b border-stone-200 pb-1 font-mono">{label}</p>
        <div className="flex items-center gap-2 pt-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
          <span className="text-stone-500">Actual Past Demand:</span>
          <span className="font-bold text-stone-900 ml-auto">{actual} Units</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#841A2B]" />
          <span className="text-stone-500">Expected Demand:</span>
          <span className="font-bold text-stone-900 ml-auto">{forecast} Units</span>
        </div>
        {variance !== null && (
          <div className="flex items-center gap-2 pt-1 border-t border-stone-200 mt-1 text-[11px]">
            <span className="text-stone-500">Variance:</span>
            <span className={cn('font-bold ml-auto font-mono', variance >= 0 ? 'text-emerald-700' : 'text-[#841A2B]')}>
              {variance >= 0 ? `+${variance}` : variance} Units
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export function HospitalDashboard() {
  const { currentUser } = useAuthStore();
  const hospitals = DEMO_ORGANIZATIONS.filter(o => o.type === 'HOSPITAL');

  // If user belongs to a hospital node (e.g. Dr. Rajesh Kumar -> SIM_HOSP_MANAPPARAI), lock/default to it
  const userHosp = hospitals.find(h => h.id === currentUser.organizationId);
  const [selectedHospId, setSelectedHospId] = useState(userHosp?.id || 'SIM_HOSP_MANAPPARAI');

  useEffect(() => {
    if (userHosp) {
      setSelectedHospId(userHosp.id);
    }
  }, [currentUser.organizationId]);

  const currentHosp = hospitals.find(h => h.id === selectedHospId) || hospitals[0];
  const inventory = DEMO_INVENTORY.filter(i => i.organizationId === currentHosp.id);
  const requests = DEMO_REQUESTS.filter(r => r.organizationId === currentHosp.id);

  const forecastData = [
    { date: '15 Sep', actual: 8, forecast: 9 },
    { date: '16 Sep', actual: 12, forecast: 11 },
    { date: '17 Sep', actual: 10, forecast: 10 },
    { date: '18 Sep', actual: 14, forecast: 13 },
    { date: '19 Sep', actual: 9, forecast: 10 },
    { date: '20 Sep (Today)', actual: 11, forecast: 11 },
    { date: '21 Sep (Est)', actual: undefined, forecast: 12 },
    { date: '22 Sep (Est)', actual: undefined, forecast: 14 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Selector & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif font-bold text-stone-900 tracking-tight">{currentHosp.name}</h1>
            <span className="text-[11px] font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
              Hospital Unit
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Local clinical blood inventory, demand tracking, and emergency transfer requisition.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Action: Request Blood */}
          <Link
            to="/requests"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#841A2B] hover:bg-[#6b1523] rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Request Blood
          </Link>

          {/* Hospital Switcher for Admin/Multi-unit testing */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-500 font-medium">Facility:</span>
            <select
              value={selectedHospId}
              onChange={e => setSelectedHospId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#841A2B]"
            >
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Role Safety Notice */}
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs text-stone-600 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-stone-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-stone-800">Clinical Workflow Rules</p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Hospital Staff can submit blood requests and record local ward usage. Inter-facility transfers must be approved by an Authorized Approver and dispatched by Logistics Staff.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-emerald-700 font-mono">
            {inventory.reduce((sum, item) => sum + item.availableUnits, 0)}
          </p>
          <p className="text-xs text-stone-500 mt-0.5 font-medium">Usable Blood Units</p>
          <p className="text-[11px] text-stone-400 mt-1">Available in hospital bank</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-stone-800 font-mono">
            {inventory.reduce((sum, item) => sum + item.reservedUnits, 0)}
          </p>
          <p className="text-xs text-stone-500 mt-0.5 font-medium">Reserved for Surgery/ICU</p>
          <p className="text-[11px] text-stone-400 mt-1">Allocated to cross-matches</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-amber-700 font-mono">
            {inventory.reduce((sum, item) => sum + item.nearExpiryUnits, 0)}
          </p>
          <p className="text-xs text-stone-500 mt-0.5 font-medium">Expiring Soon (&lt;72h)</p>
          <p className="text-[11px] text-stone-400 mt-1">Prioritize using FEFO</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-[#841A2B] font-mono">{requests.length}</p>
          <p className="text-xs text-stone-500 mt-0.5 font-medium">Active Requests</p>
          <p className="text-[11px] text-stone-400 mt-1">In transit or pending</p>
        </div>
      </div>

      {/* Inventory Grid & Forecast Chart */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Full Blood Inventory Matrix (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
            <div>
              <h2 className="text-sm font-bold text-stone-900">Hospital Blood Stock Overview</h2>
              <p className="text-[11px] text-stone-500">Group and component breakdown for {currentHosp.name}</p>
            </div>
            <Link to="/inventory" className="text-xs font-semibold text-[#841A2B] hover:underline flex items-center gap-1">
              View Detailed Batches <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-stone-500 border-b border-stone-200">
                  <th className="pb-2 font-medium">Blood Group</th>
                  <th className="pb-2 font-medium">Component</th>
                  <th className="pb-2 font-medium text-right">Available</th>
                  <th className="pb-2 font-medium text-right">Reserved</th>
                  <th className="pb-2 font-medium text-right">Expiring &lt;72h</th>
                  <th className="pb-2 font-medium text-right">Safety Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {inventory.map((inv, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-2.5 font-bold text-stone-900">{formatBloodGroup(inv.bloodGroup)}</td>
                    <td className="py-2.5 text-stone-600">{COMPONENT_LABELS[inv.componentType]}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-emerald-700">{inv.availableUnits}</td>
                    <td className="py-2.5 text-right font-mono text-stone-700">{inv.reservedUnits}</td>
                    <td className="py-2.5 text-right font-mono text-amber-700">{inv.nearExpiryUnits}</td>
                    <td className="py-2.5 text-right font-mono text-stone-500">{inv.safetyStockTarget}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hospital Demand Chart (1 col) */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="pb-2 border-b border-stone-200 mb-2">
            <h2 className="text-sm font-bold text-stone-900">Expected Blood Demand</h2>
            <p className="text-[11px] text-stone-500">Past usage vs 7-day projection</p>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#78716C' }} stroke="#E7E5E4" />
                <YAxis tick={{ fontSize: 9, fill: '#78716C' }} stroke="#E7E5E4" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="actual" stroke="#059669" strokeWidth={2} fill="#059669" fillOpacity={0.1} />
                <Area type="monotone" dataKey="forecast" stroke="#841A2B" strokeWidth={2} strokeDasharray="4 4" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
            <span>Safety Target: <strong className="text-stone-900">12 Units</strong></span>
            <Link to="/forecasting" className="font-semibold text-[#841A2B] hover:underline flex items-center gap-0.5">
              Forecast Analysis <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
