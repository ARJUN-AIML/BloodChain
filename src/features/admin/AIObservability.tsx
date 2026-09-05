import { Brain, BarChart3, TrendingUp, Zap, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { DEMO_MODEL_STATUS } from '@/lib/demo-data';

export function AIObservability() {
  const ms = DEMO_MODEL_STATUS;
  const models = Object.entries(ms.metrics);

  const comparisonData = models.map(([name, data]) => ({
    model: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    'Test WAPE %': Math.round((data as any).test.wape * 1000) / 10,
    'Test MAE': (data as any).test.mae,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex items-center gap-4 p-5 rounded-xl bg-[#FFFFFF] border border-[#E2E2DC] shadow-flat">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#FDF6F0] border border-[#F1D6C5] text-[#C85A3F]">
          <Brain className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-[#1A1F26]">
            Active Forecasting Model: <span className="text-[#C85A3F]">{ms.globalWinner.toUpperCase()}</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Model Version: {ms.modelVersion} • Dataset Size: {ms.datasetRows.toLocaleString()} rows • Date Range: {ms.dateRange}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat">
          <p className="text-xs text-[#64748B]">Mean Absolute Error (MAE)</p>
          <p className="text-2xl font-bold text-[#1A1F26] font-mono mt-1">{(ms.metrics as any).xgboost.test.mae.toFixed(2)}</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat">
          <p className="text-xs text-[#64748B]">Root Mean Sq. Error (RMSE)</p>
          <p className="text-2xl font-bold text-[#5C768D] font-mono mt-1">{(ms.metrics as any).xgboost.test.rmse.toFixed(2)}</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat">
          <p className="text-xs text-[#64748B]">Weighted APE (WAPE)</p>
          <p className="text-2xl font-bold text-[#5B8C7A] font-mono mt-1">{((ms.metrics as any).xgboost.test.wape * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat">
          <p className="text-xs text-[#64748B]">Mean Bias</p>
          <p className="text-2xl font-bold text-[#D99B38] font-mono mt-1">{(ms.metrics as any).xgboost.test.bias.toFixed(3)}</p>
        </div>
      </div>

      {/* Model Comparison Bar Chart */}
      <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat">
        <div className="pb-3 border-b border-[#E2E2DC] mb-3">
          <h3 className="text-sm font-bold text-[#1A1F26]">Model Accuracy Comparison (Test WAPE %)</h3>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E2DC" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} stroke="#E2E2DC" />
              <YAxis type="category" dataKey="model" tick={{ fontSize: 11, fill: '#1A1F26' }} stroke="#E2E2DC" />
              <Tooltip formatter={(val: number) => [`${val}%`, 'Test WAPE']} />
              <Bar dataKey="Test WAPE %" fill="#C85A3F" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Matrix */}
      <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat">
        <div className="pb-3 border-b border-[#E2E2DC] mb-3">
          <h3 className="text-sm font-bold text-[#1A1F26]">Evaluation Metrics Comparison Matrix</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[#64748B] border-b border-[#E2E2DC]">
                <th className="pb-2 font-medium">Model Candidate</th>
                <th className="pb-2 font-medium text-center">Validation MAE</th>
                <th className="pb-2 font-medium text-center">Validation WAPE</th>
                <th className="pb-2 font-medium text-center">Test MAE</th>
                <th className="pb-2 font-medium text-center">Test WAPE</th>
                <th className="pb-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E2DC]">
              {models.map(([name, data]) => {
                const d = data as any;
                const isWinner = name === ms.globalWinner;
                return (
                  <tr key={name} className="hover:bg-[#F7F7F5] transition-colors">
                    <td className="py-2.5 font-bold capitalize text-[#1A1F26]">{name.replace(/_/g, ' ')}</td>
                    <td className="py-2.5 text-center font-mono text-[#64748B]">{d.val.mae}</td>
                    <td className="py-2.5 text-center font-mono text-[#64748B]">{(d.val.wape * 100).toFixed(1)}%</td>
                    <td className="py-2.5 text-center font-mono font-bold text-[#1A1F26]">{d.test.mae}</td>
                    <td className="py-2.5 text-center font-mono font-bold text-[#5B8C7A]">{(d.test.wape * 100).toFixed(1)}%</td>
                    <td className="py-2.5 text-right">
                      {isWinner ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#E3EFEA] text-[#5B8C7A] text-[10px] font-bold">
                          ✓ WINNING MODEL
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-[#F7F7F5] text-[#64748B] text-[10px]">
                          BASELINE
                        </span>
                      )}
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
