import { useState } from 'react';
import { Truck, Thermometer, MapPin, AlertTriangle, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { cn, formatBloodGroup } from '@/lib/utils';
import { DEMO_TRANSFERS, DEMO_TEMPERATURE_LOGS } from '@/lib/demo-data';

export function LogisticsDashboard() {
  const [selectedTransferId, setSelectedTransferId] = useState<string>('TR-101');
  const transfers = DEMO_TRANSFERS;
  const activeTransfer = transfers.find(t => t.id === selectedTransferId) || transfers[0];
  const tempLogs = DEMO_TEMPERATURE_LOGS;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E2DC]">
        <div>
          <h2 className="text-xl font-bold text-[#1A1F26] tracking-tight">Cold Logistics & Active Transfers</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time cold-chain temperature monitoring, route status, and custody verification
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat">
          <p className="text-2xl font-bold text-[#C85A3F] font-mono">
            {transfers.filter(t => t.status === 'IN_TRANSIT').length}
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">In Transit Now</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat">
          <p className="text-2xl font-bold text-[#D99B38] font-mono">
            {transfers.filter(t => t.status === 'PREPARING').length}
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">Preparing Dispatch</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat">
          <p className="text-2xl font-bold text-[#5B8C7A] font-mono">
            {transfers.filter(t => t.status === 'DELIVERED' || t.status === 'VERIFIED').length}
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">Completed Today</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat">
          <p className="text-2xl font-bold text-[#5C768D] font-mono">4.2 °C</p>
          <p className="text-xs text-[#64748B] mt-0.5">Avg Box Temp</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Transfer Select List (1 col) */}
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E2DC] mb-3">
            <h3 className="text-sm font-bold text-[#1A1F26]">Active Dispatches</h3>
            <span className="text-xs text-[#64748B]">{transfers.length} total</span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
            {transfers.map(t => {
              const isSelected = t.id === selectedTransferId;
              const isInTransit = t.status === 'IN_TRANSIT';
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTransferId(t.id)}
                  className={cn(
                    'p-3 rounded-lg border text-xs cursor-pointer transition-all',
                    isSelected
                      ? 'bg-[#FDF6F0] border-[#C85A3F] shadow-flat'
                      : 'bg-[#F7F7F5] border-[#E2E2DC] hover:border-[#D4D4CE]'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-[#1A1F26]">{t.id}</span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase',
                      isInTransit ? 'bg-[#C85A3F] text-[#FFFFFF]' : 'bg-[#E3EFEA] text-[#5B8C7A]'
                    )}>
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="font-semibold text-[#1A1F26] mt-1">{t.sourceName || t.sourceOrganizationName}</p>
                  <p className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5">
                    <ArrowRight className="w-3 h-3 text-[#64748B]" /> {t.destinationName || t.destinationOrganizationName}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E2E2DC]/60 text-[10px] text-[#64748B]">
                    <span>{t.bloodGroups ? t.bloodGroups.join(', ') : 'O+'} • {t.unitCount || t.units || 5} units</span>
                    <span>ETA: <strong className="text-[#1A1F26]">{t.etaMinutes || t.routeDurationMinutes} min</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transfer Waypoint Route & Cold Chain Telemetry (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Waypoint Route Details Card */}
          <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E2DC] mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1A1F26]">Waypoints & Custody Timeline — {activeTransfer.id}</h3>
                <p className="text-[11px] text-[#64748B]">{activeTransfer.sourceName || activeTransfer.sourceOrganizationName} → {activeTransfer.destinationName || activeTransfer.destinationOrganizationName}</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#F7F7F5] border border-[#E2E2DC] text-xs font-mono font-bold text-[#1A1F26]">
                Courier: {activeTransfer.courierName || 'Rapid Express Medical'}
              </span>
            </div>

            {/* Status Timeline */}
            <div className="grid grid-cols-4 gap-2 text-center pt-2">
              {[
                { label: 'Requested', done: true, time: '14:10' },
                { label: 'Dispatch Prepared', done: true, time: '14:25' },
                { label: 'In Transit', done: activeTransfer.status === 'IN_TRANSIT' || activeTransfer.status === 'DELIVERED', time: '14:35' },
                { label: 'Delivered', done: activeTransfer.status === 'DELIVERED', time: 'Est. 15:05' },
              ].map((step, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 border',
                    step.done ? 'bg-[#5B8C7A] text-[#FFFFFF] border-[#5B8C7A]' : 'bg-[#F7F7F5] text-[#64748B] border-[#E2E2DC]'
                  )}>
                    {step.done ? '✓' : idx + 1}
                  </div>
                  <p className="text-[11px] font-semibold text-[#1A1F26]">{step.label}</p>
                  <p className="text-[9px] text-[#64748B]">{step.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cold Chain IoT Temperature Chart */}
          <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E2DC] mb-2">
              <div>
                <h3 className="text-sm font-bold text-[#1A1F26]">IoT Cold-Chain Telemetry (Safe: 2°C – 8°C)</h3>
                <p className="text-[11px] text-[#64748B]">Continuous temperature sensor logs inside insulated transit container</p>
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E3EFEA] text-[#5B8C7A] text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B8C7A]" />
                Optimal Temp Range
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempLogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E2DC" vertical={false} />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#64748B' }} stroke="#E2E2DC" />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} stroke="#E2E2DC" domain={[0, 10]} />
                  <Tooltip formatter={(value: number) => [`${value} °C`, 'Box Temperature']} />
                  <ReferenceLine y={2.0} stroke="#C85A3F" strokeDasharray="3 3" label={{ value: 'Min Safe (2°C)', fill: '#C85A3F', fontSize: 10 }} />
                  <ReferenceLine y={8.0} stroke="#C85A3F" strokeDasharray="3 3" label={{ value: 'Max Safe (8°C)', fill: '#C85A3F', fontSize: 10 }} />
                  <Line type="monotone" dataKey="temperatureC" stroke="#5C768D" strokeWidth={2.5} dot={{ r: 3, fill: '#5C768D' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
