import { useState, useMemo } from 'react';
import { Brain, BarChart3, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, formatBloodGroup, COMPONENT_LABELS } from '@/lib/utils';
import { DEMO_ORGANIZATIONS, generateDemoForecasts, generateDemoHistory } from '@/lib/demo-data';
import type { BloodGroup, ComponentType } from '@/types';

const BLOOD_GROUPS: BloodGroup[] = ['O_POSITIVE','A_POSITIVE','B_POSITIVE','AB_POSITIVE','O_NEGATIVE','A_NEGATIVE','B_NEGATIVE','AB_NEGATIVE'];
const COMPONENTS: ComponentType[] = ['RBC','PLASMA','PLATELETS','WHOLE_BLOOD'];

const CustomForecastTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const actual = payload.find((p: any) => p.dataKey === 'actual')?.value;
    const forecast = payload.find((p: any) => p.dataKey === 'forecast')?.value;
    const lower = payload.find((p: any) => p.dataKey === 'lower')?.value;
    const upper = payload.find((p: any) => p.dataKey === 'upper')?.value;
    const variance = (actual !== undefined && forecast !== undefined) ? actual - forecast : null;

    return (
      <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-lg p-3 shadow-soft text-xs space-y-1">
        <p className="font-bold text-[#1A1F26] border-b border-[#E2E2DC] pb-1 font-mono">{label}</p>
        {actual !== undefined && (
          <div className="flex items-center gap-2 pt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5B8C7A]" />
            <span className="text-[#64748B]">Actual Demand:</span>
            <span className="font-bold text-[#1A1F26] ml-auto">{actual} Units</span>
          </div>
        )}
        {forecast !== undefined && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C85A3F]" />
            <span className="text-[#64748B]">AI Forecast:</span>
            <span className="font-bold text-[#1A1F26] ml-auto">{forecast} Units</span>
          </div>
        )}
        {lower !== undefined && upper !== undefined && (
          <div className="text-[11px] text-[#64748B] pt-0.5">
            90% CI: <strong className="text-[#1A1F26]">[{lower}, {upper}] Units</strong>
          </div>
        )}
        {variance !== null && (
          <div className="flex items-center gap-2 pt-1 border-t border-[#E2E2DC]/50 mt-1 text-[11px]">
            <span className="text-[#64748B]">Variance:</span>
            <span className={cn('font-bold ml-auto font-mono', variance >= 0 ? 'text-[#5B8C7A]' : 'text-[#C85A3F]')}>
              {variance >= 0 ? `+${variance}` : variance} Units
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export function ForecastingPage() {
  const [orgId, setOrgId] = useState('HOSP_A');
  const [bg, setBg] = useState<BloodGroup>('O_POSITIVE');
  const [comp, setComp] = useState<ComponentType>('RBC');

  const orgs = DEMO_ORGANIZATIONS.filter(o => o.type === 'HOSPITAL' || o.type === 'BLOOD_BANK');
  const forecasts = generateDemoForecasts(orgId);
  const history = generateDemoHistory(orgId, bg, comp);
  const forecast = forecasts.find(f => f.bloodGroup === bg && f.componentType === comp);

  const chartData = useMemo(() => {
    const data = history.map(h => ({
      date: h.date.slice(5),
      actual: h.unitsUsed,
      forecast: undefined as number | undefined,
      lower: undefined as number | undefined,
      upper: undefined as number | undefined,
    }));
    if (forecast) {
      for (let i = 1; i <= 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const jitter = 1 + (Math.random() - 0.5) * 0.1;
        data.push({
          date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          actual: undefined as any,
          forecast: Math.round(forecast.predictedUnits * jitter * 10) / 10,
          lower: Math.round(forecast.lowerBound * jitter * 10) / 10,
          upper: Math.round(forecast.upperBound * jitter * 10) / 10,
        });
      }
    }
    return data;
  }, [history, forecast]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E2DC]">
        <div>
          <h2 className="text-xl font-bold text-[#1A1F26] tracking-tight">AI Demand Forecasting & Analytics</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            XGBoost time-series predictions with 90% empirical confidence intervals
          </p>
        </div>
      </div>

      {/* Segment Selector Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-[#FFFFFF] border border-[#E2E2DC] shadow-flat">
        <Brain className="w-5 h-5 text-[#5C768D]" />
        <select
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-[#E2E2DC] bg-[#F7F7F5] text-xs font-semibold text-[#1A1F26] focus:outline-none"
        >
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select
          value={bg}
          onChange={(e) => setBg(e.target.value as BloodGroup)}
          className="px-3 py-1.5 rounded-lg border border-[#E2E2DC] bg-[#F7F7F5] text-xs font-semibold text-[#1A1F26] focus:outline-none"
        >
          {BLOOD_GROUPS.map(b => <option key={b} value={b}>{formatBloodGroup(b)}</option>)}
        </select>
        <select
          value={comp}
          onChange={(e) => setComp(e.target.value as ComponentType)}
          className="px-3 py-1.5 rounded-lg border border-[#E2E2DC] bg-[#F7F7F5] text-xs font-semibold text-[#1A1F26] focus:outline-none"
        >
          {COMPONENTS.map(c => <option key={c} value={c}>{COMPONENT_LABELS[c]}</option>)}
        </select>

        {forecast && (
          <div className="ml-auto flex items-center gap-4 text-xs">
            <span className="text-[#64748B]">Active Model: <strong className="text-[#C85A3F]">{forecast.modelName}</strong></span>
            <span className="text-[#64748B]">Predicted: <strong className="text-[#5B8C7A]">{forecast.predictedUnits} units</strong></span>
            <span className="text-[#64748B]">CI: <strong>[{forecast.lowerBound}, {forecast.upperBound}]</strong></span>
          </div>
        )}
      </div>

      {/* Main Forecast Chart */}
      <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat">
        <div className="pb-3 border-b border-[#E2E2DC] mb-3">
          <h3 className="text-sm font-bold text-[#1A1F26]">Historical Demand vs. AI Projection ({formatBloodGroup(bg)} {COMPONENT_LABELS[comp]})</h3>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E2DC" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} stroke="#E2E2DC" />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} stroke="#E2E2DC" />
              <Tooltip content={<CustomForecastTooltip />} />
              <Area type="monotone" dataKey="actual" stroke="#5B8C7A" strokeWidth={2.5} fill="#5B8C7A" fillOpacity={0.1} name="Actual" />
              <Area type="monotone" dataKey="upper" stroke="none" fill="#C85A3F" fillOpacity={0.08} name="Upper Bound" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="transparent" name="Lower Bound" />
              <Area type="monotone" dataKey="forecast" stroke="#C85A3F" strokeWidth={2.5} strokeDasharray="5 5" fill="none" name="Forecast" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
