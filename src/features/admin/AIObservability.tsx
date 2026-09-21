import { useState } from 'react';
import {
  Brain, BarChart3, TrendingUp, Zap, Clock, ShieldCheck,
  AlertTriangle, FileText, CheckCircle2, ShieldAlert, Cpu,
  Database, GitBranch, Scale, Layers, Info, Lock, Thermometer
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { DEMO_MODEL_STATUS, SYNTHETIC_DATA_NOTICE } from '@/lib/demo-data';

export function AIObservability() {
  const ms = DEMO_MODEL_STATUS;
  const [activeSection, setActiveSection] = useState<'benchmarks' | 'intervals' | 'shortage-safety' | 'optimization' | 'limitations'>('benchmarks');

  const benchmarkChartData = ms.benchmarks.map(b => ({
    name: b.model.replace(' (Trichy Tuned)', ''),
    'MAE (Units)': b.mae,
    'RMSE (Units)': b.rmse,
    'MASE': b.mase,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Synthetic Data Governance Header Notice */}
      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="font-bold font-mono tracking-wide">{SYNTHETIC_DATA_NOTICE}</span>
          <span className="text-amber-700 hidden md:inline">• Tiruchirappalli Regional Research & Validation Prototype</span>
        </div>
        <span className="text-[10px] font-mono text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded">
          Walk-Forward Validation: No Random Shuffling
        </span>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#FDF2F4] border border-[#F5D3D9] text-[#841A2B] flex-shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-900">
                System Monitoring
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-100 text-stone-700 border border-stone-200">
                Technical Benchmarks
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Technical performance metrics, forecasting accuracy benchmarks, and research limitations.
            </p>
          </div>
        </div>

        {/* Navigation Mode Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveSection('benchmarks')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeSection === 'benchmarks' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Baseline Benchmarks
          </button>
          <button
            onClick={() => setActiveSection('intervals')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeSection === 'intervals' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Interval Calibration
          </button>
          <button
            onClick={() => setActiveSection('shortage-safety')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeSection === 'shortage-safety' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Shortage Safety & Recall
          </button>
          <button
            onClick={() => setActiveSection('optimization')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeSection === 'optimization' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Optimizer Comparison
          </button>
          <button
            onClick={() => setActiveSection('limitations')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeSection === 'limitations' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Limitations & Governance
          </button>
        </div>
      </div>

      {/* SECTION 1: Baseline Benchmarks */}
      {activeSection === 'benchmarks' && (
        <div className="space-y-6">
          {/* Top 4 Metric Highlights */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Mean Absolute Error (MAE)</span>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">1.82 <span className="text-xs font-normal text-slate-400">units</span></p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-1">33.5% lower error vs Seasonal Naive</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Root Mean Sq. Error (RMSE)</span>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">2.41 <span className="text-xs font-normal text-slate-400">units</span></p>
              <p className="text-[10px] text-slate-400 mt-1">Penalizes large variance swings</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">MASE (Scaled Error)</span>
              <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">0.78</p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-1">&lt; 1.0 indicates beats naive benchmark</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Mean Forecast Bias</span>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">+0.02 <span className="text-xs font-normal text-slate-400">units</span></p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-1">Near-zero systematic over/under prediction</p>
            </div>
          </div>

          {/* Model Comparison Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Forecasting Benchmarks against Simpler Statistical Baselines
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evaluated on out-of-time test dataset (2024 daily sequence) across all 8 Tiruchirappalli facilities
                </p>
              </div>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                Temporal Walk-Forward Split
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Model Candidate</th>
                    <th className="py-2.5 px-3">Specification & Lags</th>
                    <th className="py-2.5 px-3 text-right">MAE</th>
                    <th className="py-2.5 px-3 text-right">RMSE</th>
                    <th className="py-2.5 px-3 text-right">WAPE</th>
                    <th className="py-2.5 px-3 text-right">MASE</th>
                    <th className="py-2.5 px-3 text-right">Bias</th>
                    <th className="py-2.5 px-3 text-right">Inference Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ms.benchmarks.map((b, idx) => (
                    <tr key={b.model} className={idx === 0 ? 'bg-red-50/40 font-semibold' : 'hover:bg-slate-50/80'}>
                      <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                        {idx === 0 && <span className="w-2 h-2 rounded-full bg-red-600" />}
                        {b.model}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">{b.type}</td>
                      <td className="py-3 px-3 text-right font-mono">{b.mae.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono">{b.rmse.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono">{((b.wape) * 100).toFixed(1)}%</td>
                      <td className={cn('py-3 px-3 text-right font-mono font-bold', b.mase < 1.0 ? 'text-emerald-700' : 'text-slate-700')}>
                        {b.mase.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">{b.bias > 0 ? `+${b.bias.toFixed(2)}` : b.bias.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">{b.inferenceTimeMs} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 leading-relaxed space-y-1">
              <p>
                <strong>Scientific Methodology:</strong> Time-series data must never undergo random K-fold splitting. The 3-year historical dataset is partitioned chronologically: 2022–2023 (Training: 730 days), Jan–Jun 2024 (Validation: 182 days), and Jul–Dec 2024 (Out-of-time Test: 184 days).
              </p>
              <p>
                <strong>MASE Interpretation:</strong> A MASE score &lt; 1.0 proves that the trained model outperforms the seasonal naive lag baseline.
              </p>
            </div>
          </div>

          {/* Graphical Error Comparison */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Comparative Error Metrics Across Models
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={benchmarkChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend />
                  <Bar dataKey="MAE (Units)" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="RMSE (Units)" fill="#0284C7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="MASE" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Prediction Interval Calibration */}
      {activeSection === 'intervals' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Prediction Interval Calibration & Coverage Analysis (P10 / P50 / P90)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evaluating whether empirical quantile coverage matches nominal confidence targets
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {ms.predictionIntervals.calibrationStatus}
              </span>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-xs text-slate-500 font-medium">90% Nominal Coverage</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-mono font-bold text-slate-900">
                    {(ms.predictionIntervals.empiricalCoverage90 * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold">Target: 90.0%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Calibration delta: -0.8% (Well Calibrated)</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-xs text-slate-500 font-medium">80% Nominal Coverage</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-mono font-bold text-slate-900">
                    {(ms.predictionIntervals.empiricalCoverage80 * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold">Target: 80.0%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Calibration delta: +1.4% (Conservative)</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Mean Interval Width</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-mono font-bold text-slate-900">
                    {ms.predictionIntervals.meanIntervalWidthUnits}
                  </span>
                  <span className="text-xs text-slate-500">units (P90 - P10)</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Provides sharp, actionable safety bounds</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-sky-600" />
                Conformal Empirical Residuals Methodology:
              </p>
              <p className="text-[11px] leading-relaxed">
                Rather than assuming Gaussian error distributions (which fail for rare blood demand surges), prediction intervals are constructed via <strong>conformal empirical residuals</strong> computed on walk-forward rolling splits. This guarantees that clinical safety buffers (P90) genuinely capture high-demand demand events in 9 out of 10 days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Shortage Safety & Recall */}
      {activeSection === 'shortage-safety' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Shortage Risk Safety & False-Negative Sensitivity Analysis
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                In healthcare logistics, a False Negative (failing to predict a shortage) directly threatens patient lives.
              </p>
            </div>

            <div className="grid sm:grid-cols-4 gap-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                <span className="text-xs text-red-700 font-bold block">Recall (Sensitivity)</span>
                <span className="text-3xl font-mono font-extrabold text-red-600 mt-1 block">
                  {((ms.shortageRiskEvaluation as any).recall * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-red-600 mt-1 block">42 of 44 critical events detected</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="text-xs text-slate-500 font-medium block">Precision</span>
                <span className="text-3xl font-mono font-bold text-slate-900 mt-1 block">
                  {((ms.shortageRiskEvaluation as any).precision * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">6 false alarms across test series</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="text-xs text-slate-500 font-medium block">F2 Safety Score</span>
                <span className="text-3xl font-mono font-bold text-slate-900 mt-1 block">
                  {((ms.shortageRiskEvaluation as any).f2Score * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Weights recall 2x over precision</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="text-xs text-slate-500 font-medium block">False Negatives (Missed)</span>
                <span className="text-3xl font-mono font-bold text-emerald-600 mt-1 block">
                  {(ms.shortageRiskEvaluation as any).falseNegatives}
                </span>
                <span className="text-[10px] text-emerald-600 mt-1 block">Ultra-low clinical failure rate</span>
              </div>
            </div>

            {/* Confusion Matrix Display */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-900 mb-2">3-Day Lookahead Confusion Matrix (142 Evaluation Windows)</h4>
              <div className="grid grid-cols-2 max-w-md gap-2 text-center text-xs font-mono">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 block">True Positives (Correct Shortages)</span>
                  <span className="text-xl font-bold text-emerald-700">42</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">False Positives (Precautionary Alarms)</span>
                  <span className="text-xl font-bold text-slate-700">6</span>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <span className="text-[10px] text-red-700 block">False Negatives (Missed Shortages)</span>
                  <span className="text-xl font-bold text-red-600">2</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">True Negatives (Normal Stock)</span>
                  <span className="text-xl font-bold text-slate-700">92</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: Optimizer Comparison */}
      {activeSection === 'optimization' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Multi-Hospital Allocation Algorithm Comparison
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulated emergency transfer benchmark across 50 multi-facility deficit scenarios
              </p>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Algorithm</th>
                    <th className="py-2.5 px-3 text-center">Demand Met %</th>
                    <th className="py-2.5 px-3 text-center">Secondary Shortages Induced</th>
                    <th className="py-2.5 px-3 text-center">Mean Transit (min)</th>
                    <th className="py-2.5 px-3 text-center">Solver Time</th>
                    <th className="py-2.5 px-3">Safety & Operational Trade-off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ms.optimizationComparison.map((opt, i) => (
                    <tr key={opt.algorithm} className={i === 0 ? 'bg-emerald-50/40 font-semibold' : 'hover:bg-slate-50'}>
                      <td className="py-3 px-3 font-bold text-slate-900">{opt.algorithm}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {opt.demandSatisfactionPct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span className={opt.secondaryShortagesCreated === 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {opt.secondaryShortagesCreated}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">{opt.meanTravelTimeMinutes.toFixed(1)} min</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">{opt.solverRuntimeMs} ms</td>
                      <td className="py-3 px-3 text-slate-600 text-[11px] leading-relaxed">{opt.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FEFO vs FIFO Discard Reduction Card */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-600" />
                FEFO Cross-Facility Rescue vs. Siloed Local Storage Benchmark
              </h4>
              <div className="grid sm:grid-cols-3 gap-4 text-xs font-mono pt-1">
                <div>
                  <span className="text-slate-500 block text-[10px]">Siloed FIFO Discard Rate:</span>
                  <span className="text-lg font-bold text-red-600">12.8%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Cross-Facility FEFO Discard:</span>
                  <span className="text-lg font-bold text-emerald-600">4.1%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Relative Discard Reduction:</span>
                  <span className="text-lg font-bold text-sky-600">-68.0%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: Limitations & Data Governance */}
      {activeSection === 'limitations' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Clinical Deployment Limitations & Scientific Governance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Explicit boundaries governing prototype safety and algorithmic decision support
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  1. Synthetic Data & Non-Live Operational Status
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  All facility names, patient counts, blood units, and geographic coordinates are synthetic demo data created for the Tiruchirappalli regional research cluster. No live integration with actual hospitals (e.g. Trichy GH or private clinics) is active.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-red-600" />
                  2. Mandatory Human Clinical Sign-Off Invariant
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Under no circumstances does BloodChain AI automatically dispatch or reallocate physical blood units. All solver outputs are purely decision support recommendations that require manual sign-off by an Authorized Clinical Approver.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-sky-600" />
                  3. Physical Sensor Hardware Dependencies
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Cold-chain telematics assume functioning BLE/Cellular dataloggers with ±0.1°C calibration. In real deployment, physical sensor failure, battery degradation, or network dead zones along rural routes require fallback mechanical indicator validation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  4. Interoperability Standards Mapping
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Digital manifests simulate ISBT 128 barcoding standards (13-character DIN, product codes, and check characters) and map onto HL7 FHIR v4.0 Observation resources. Integration with existing blood bank LIS requires conformance testing with CDAC e-RaktKosh APIs.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
