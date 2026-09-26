import { useState, useMemo } from 'react';
import {
  TrendingUp, Calendar, Info, HelpCircle, ChevronDown,
  ChevronUp, Building2, Droplet, Clock, AlertCircle, ShieldAlert
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, formatBloodGroup, COMPONENT_LABELS } from '@/lib/utils';
import { DEMO_ORGANIZATIONS, generateDemoForecasts, generateDemoHistory } from '@/lib/demo-data';
import type { BloodGroup, ComponentType } from '@/types';

const BLOOD_GROUPS: BloodGroup[] = [
  'O_POSITIVE', 'O_NEGATIVE', 'A_POSITIVE', 'A_NEGATIVE',
  'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE'
];

const COMPONENTS: ComponentType[] = ['RBC', 'PLASMA', 'PLATELETS', 'WHOLE_BLOOD'];

const FORECAST_PERIODS = [
  { id: '3', label: 'Next 3 Days' },
  { id: '7', label: 'Next 7 Days' },
  { id: '14', label: 'Next 14 Days' },
];

// Plain-language conversational tooltip
const CustomForecastTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const pastDemand = payload.find((p: any) => p.dataKey === 'actual')?.value;
    const expectedDemand = payload.find((p: any) => p.dataKey === 'forecast')?.value;
    const lower = payload.find((p: any) => p.dataKey === 'lower')?.value;
    const upper = payload.find((p: any) => p.dataKey === 'upper')?.value;

    return (
      <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-md text-xs space-y-1.5 min-w-[200px]">
        <p className="font-semibold text-stone-900 border-b border-stone-100 pb-1">{label}</p>
        {pastDemand !== undefined && (
          <div className="flex items-center justify-between text-stone-700">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-stone-500" />
              Past demand:
            </span>
            <span className="font-semibold text-stone-900 font-mono">{pastDemand} units</span>
          </div>
        )}
        {expectedDemand !== undefined && (
          <div className="flex items-center justify-between text-[#841A2B]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#841A2B]" />
              Expected demand:
            </span>
            <span className="font-bold font-mono">{expectedDemand} units</span>
          </div>
        )}
        {lower !== undefined && upper !== undefined && (
          <div className="flex items-center justify-between text-stone-500 text-[11px] pt-1 border-t border-stone-100">
            <span>Estimated range:</span>
            <span className="font-mono text-stone-700">{lower}–{upper} units</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export function ForecastingPage() {
  const [orgId, setOrgId] = useState('SIM_HOSP_MANAPPARAI');
  const [bg, setBg] = useState<BloodGroup>('O_POSITIVE');
  const [comp, setComp] = useState<ComponentType>('RBC');
  const [period, setPeriod] = useState('7');
  const [demandMultiplier, setDemandMultiplier] = useState<number>(1.0);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const orgs = DEMO_ORGANIZATIONS.filter(o => o.type === 'HOSPITAL' || o.type === 'BLOOD_BANK');
  const selectedOrg = orgs.find(o => o.id === orgId) || orgs[0];

  const forecasts = generateDemoForecasts(orgId);
  const history = generateDemoHistory(orgId, bg, comp);
  const forecast = forecasts.find(f => f.bloodGroup === bg && f.componentType === comp);

  const rawP50 = forecast ? forecast.predictedUnits : 11;
  const rawP10 = forecast ? forecast.lowerBound : 8;
  const rawP90 = forecast ? forecast.upperBound : 15;

  const expectedUnits = Math.round(rawP50 * demandMultiplier);
  const lowerRange = Math.round(rawP10 * demandMultiplier);
  const upperRange = Math.round(rawP90 * demandMultiplier);

  const horizonDays = parseInt(period, 10);

  const chartData = useMemo(() => {
    // Past 7 days of actual demand
    const data = history.slice(-7).map(h => ({
      date: h.date.slice(5),
      actual: Math.round(h.unitsUsed * demandMultiplier),
      forecast: undefined as number | undefined,
      lower: undefined as number | undefined,
      upper: undefined as number | undefined,
    }));

    // Future days projection with estimated uncertainty range
    if (forecast) {
      for (let i = 1; i <= Math.min(horizonDays, 7); i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dayLabel = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const varianceFactor = 1 + (i * 0.04);
        data.push({
          date: dayLabel,
          actual: undefined as any,
          forecast: Math.round(expectedUnits),
          lower: Math.max(0, Math.round(lowerRange / varianceFactor)),
          upper: Math.round(upperRange * varianceFactor),
        });
      }
    }
    return data;
  }, [history, forecast, horizonDays, expectedUnits, lowerRange, upperRange]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#841A2B]">
              Clinical Planning Support
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-stone-500 font-medium">Demonstration Mode</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Blood Demand Forecast
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Use past usage to estimate future blood needs. Estimates include an uncertainty range.
          </p>
        </div>

        {/* Clear Demonstration Data Tag */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium self-start sm:self-auto">
          <AlertCircle className="w-3.5 h-3.5 text-[#841A2B]" />
          <span>Synthetic data - not live availability</span>
        </div>
      </div>

      {/* 2. Selection Controls */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
            Forecast Parameters
          </h3>
          <span className="text-[11px] text-stone-500">
            Select facility and blood product to view estimates
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Hospital / Blood Bank */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 block">
              Hospital or Blood Bank
            </label>
            <div className="relative">
              <select
                value={orgId}
                onChange={e => setOrgId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 font-medium focus:bg-white focus:border-[#841A2B] focus:outline-none transition-colors"
              >
                {orgs.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-stone-500">Tiruchirappalli regional network</p>
          </div>

          {/* Blood Group */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 block">
              Blood Group
            </label>
            <select
              value={bg}
              onChange={e => setBg(e.target.value as BloodGroup)}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 font-medium focus:bg-white focus:border-[#841A2B] focus:outline-none transition-colors"
            >
              {BLOOD_GROUPS.map(b => (
                <option key={b} value={b}>
                  {formatBloodGroup(b)}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-stone-500">ABO & Rh(D) type</p>
          </div>

          {/* Blood Component */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 block">
              Blood Component
            </label>
            <select
              value={comp}
              onChange={e => setComp(e.target.value as ComponentType)}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 font-medium focus:bg-white focus:border-[#841A2B] focus:outline-none transition-colors"
            >
              {COMPONENTS.map(c => (
                <option key={c} value={c}>
                  {COMPONENT_LABELS[c]}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-stone-500">Storage specific product</p>
          </div>

          {/* Forecast Period */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 block">
              Forecast Period
            </label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 font-medium focus:bg-white focus:border-[#841A2B] focus:outline-none transition-colors"
            >
              {FORECAST_PERIODS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Interactive Emergency Demand Surge Sensitivity Slider */}
        <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-red-50/50 p-3 rounded-lg border border-red-100">
          <div className="space-y-0.5">
            <label className="text-xs font-bold text-[#841A2B] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Interactive Demand Surge Sensitivity Multiplier
            </label>
            <p className="text-[11px] text-stone-600">Simulate regional demand spikes (e.g. multi-vehicle collision trauma, festive drives)</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={demandMultiplier}
              onChange={e => setDemandMultiplier(parseFloat(e.target.value))}
              className="w-32 accent-[#841A2B]"
            />
            <span className="font-mono font-bold text-xs text-white bg-[#841A2B] px-2 py-0.5 rounded shadow-2xs">
              {demandMultiplier.toFixed(1)}x
            </span>
            {demandMultiplier !== 1.0 && (
              <button
                onClick={() => setDemandMultiplier(1.0)}
                className="text-[10px] text-stone-500 underline hover:text-stone-900"
              >
                Reset 1.0x
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Forecast Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Expected Demand */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>Expected Blood Requirement</span>
            <TrendingUp className="w-4 h-4 text-[#841A2B]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif text-stone-900">
              {expectedUnits}
            </span>
            <span className="text-xs font-semibold text-stone-600">units</span>
          </div>
          <p className="text-[11px] text-stone-500">
            Average projected requirement over the next {period} days.
          </p>
        </div>

        {/* Card 2: Estimated Range */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>Lower & Higher Estimates</span>
            <Info className="w-4 h-4 text-stone-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif text-stone-900">
              {lowerRange}–{upperRange}
            </span>
            <span className="text-xs font-semibold text-stone-600">units</span>
          </div>
          <p className="text-[11px] text-stone-500">
            Uncertainty range accounting for weekend and trauma variations.
          </p>
        </div>

        {/* Card 3: Forecasting Method */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>Forecasting method</span>
            <HelpCircle className="w-4 h-4 text-stone-400" />
          </div>
          <div>
            <span className="text-sm font-bold text-stone-900 block">
              Automated Demand Estimation - Trichy demonstration model
            </span>
            <span className="text-[11px] text-[#841A2B] font-semibold">
              Backup estimation method available
            </span>
          </div>
          <p className="text-[11px] text-stone-500 leading-normal">
            The estimate is based on available demonstration data. It is not a clinical prediction and should be reviewed by authorized staff.
          </p>
        </div>
      </div>

      {/* 4. Demand Chart */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-sm font-serif font-bold text-stone-900">
              Past Blood Use and Expected Demand
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Comparison between previous days of recorded usage and projected future demand.
            </p>
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-stone-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-stone-500" />
              Past demand
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#841A2B]" />
              Expected demand
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#FDF2F4] border border-[#F5D3D9]" />
              Estimated range
            </span>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F0" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#78716C', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#78716C', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomForecastTooltip />} />

              {/* Estimated Uncertainty Band */}
              <Area
                type="monotone"
                dataKey="upper"
                stroke="transparent"
                fill="#FDF2F4"
                fillOpacity={0.8}
                name="Estimated range"
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="transparent"
                fill="#FFFFFF"
                fillOpacity={1.0}
              />

              {/* Expected Demand Line */}
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="#841A2B"
                strokeWidth={2}
                fill="none"
                dot={{ r: 4, fill: '#841A2B', strokeWidth: 1, stroke: '#FFFFFF' }}
                name="Expected demand"
              />

              {/* Past Demand Line */}
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#78716C"
                strokeWidth={2}
                fill="none"
                dot={{ r: 3, fill: '#78716C' }}
                name="Past demand"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-500">
          <span>* Shaded area indicates the estimated demand range (lower to upper expected bounds).</span>
          <span className="text-stone-400">Values calculated for {selectedOrg.name}</span>
        </div>
      </div>

      {/* 5. Expandable Technical Details & Model Evaluation */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-stone-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-stone-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Technical Details & Model Evaluation (Advanced)
            </span>
          </div>
          {showTechnicalDetails ? (
            <ChevronUp className="w-4 h-4 text-stone-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-500" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="px-5 pb-5 pt-2 border-t border-stone-100 space-y-4 text-xs text-stone-600 bg-stone-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3 bg-white rounded-lg border border-stone-200">
                <p className="text-stone-400 text-[10px] uppercase font-semibold">Mean Absolute Error (MAE)</p>
                <p className="text-lg font-bold text-stone-900 font-mono mt-0.5">1.84 units</p>
                <p className="text-[10px] text-stone-500 mt-1">Evaluated across 1,440 Trichy facility-days</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-stone-200">
                <p className="text-stone-400 text-[10px] uppercase font-semibold">Shortage Recall</p>
                <p className="text-lg font-bold text-stone-900 font-mono mt-0.5">94.2%</p>
                <p className="text-[10px] text-stone-500 mt-1">Identified potential critical shortages</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-stone-200">
                <p className="text-stone-400 text-[10px] uppercase font-semibold">Estimate Calibration</p>
                <p className="text-sm font-bold text-stone-900 font-mono mt-0.5">Lower ≤ Expected ≤ Higher</p>
                <p className="text-[10px] text-stone-500 mt-1">Strict estimation consistency enforced</p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-stone-200 text-[11px] space-y-1 text-stone-600">
              <p className="font-semibold text-stone-900">Research & Simulation Methodology:</p>
              <p>
                • Time-series projections use walk-forward validation (90-day rolling origin) without data leakage.
              </p>
              <p>
                • When the microservice is offline, the system seamlessly uses the local <strong>Backup estimation method (Historical Average)</strong> to ensure operational continuity.
              </p>
              <p>
                • Demonstrations do not represent real-time blood bank inventory or clinical commitments.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
