import { useState } from 'react';
import {
  Zap, AlertTriangle, ShieldCheck, RefreshCw, Play, Building2,
  TrendingUp, ArrowRight, Activity, Layers, CheckCircle2,
} from 'lucide-react';
import { DEMO_SCENARIOS, DEMO_SHORTAGES, DEMO_ORGANIZATIONS } from '@/lib/demo-data';
import { useAuditStore } from '@/lib/audit-store';
import { useAuthStore } from '@/lib/auth-store';
import type { SimulationScenario } from '@/types';

export function EmergencySimulationCenter() {
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario>(DEMO_SCENARIOS[1]); // Default to Mass Casualty
  const [demandMultiplier, setDemandMultiplier] = useState<number>(DEMO_SCENARIOS[1].demandMultiplier);
  const [donationChange, setDonationChange] = useState<number>(DEMO_SCENARIOS[1].donationChangePercent);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lastSimulatedTime, setLastSimulatedTime] = useState<string | null>(null);

  const { currentUser } = useAuthStore();
  const { logAction } = useAuditStore();

  // Simulated metrics based on parameters
  const baselineDeficit = 20.2;
  const simulatedDeficit = Math.round(baselineDeficit * demandMultiplier * (1 - donationChange / 100) * 10) / 10;
  const criticalFacilitiesCount = Math.min(5, Math.max(1, Math.round(1 * demandMultiplier)));
  const transfersNeeded = Math.round(simulatedDeficit * 0.7);
  const safeShareAvailable = Math.max(0, Math.round(118 / demandMultiplier));

  const handleScenarioChange = (scenario: SimulationScenario) => {
    setSelectedScenario(scenario);
    setDemandMultiplier(scenario.demandMultiplier);
    setDonationChange(scenario.donationChangePercent);
  };

  const handleRunSimulation = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setLastSimulatedTime(new Date().toLocaleTimeString());
      logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'EMERGENCY_SIMULATION_EXECUTED',
        entityType: 'SIMULATION',
        entityId: selectedScenario.id,
        oldValue: 'Baseline Demand 1.0x',
        newValue: `Scenario: ${selectedScenario.name} (Multiplier: ${demandMultiplier}x, Deficit: ${simulatedDeficit} units)`,
        reason: `Stress-tested network resilience under scenario: ${selectedScenario.description}`,
      });
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#1A1F26] via-[#2C3E50] to-[#1A1F26] text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#E53E3E]" />
            <h2 className="text-xl font-bold tracking-tight">Emergency Digital Twin & Scenario Simulator</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E53E3E]/20 text-[#FC8181] border border-[#E53E3E]/30 uppercase tracking-wider">
              Stress Testing Mode
            </span>
          </div>
          <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
            Simulate regional crises, mass casualty demand surges, donation drops, and facility power outages in real-time to verify network redistribution responsiveness.
          </p>
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={isRunning}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#C85A3F] text-white font-bold text-xs hover:bg-[#A8432B] transition-all shadow-md disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running Digital Twin Simulation...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              Execute Stress Test Simulation
            </>
          )}
        </button>
      </div>

      {/* Preset Scenarios Selector */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {DEMO_SCENARIOS.map(scen => {
          const isSelected = selectedScenario.id === scen.id;
          return (
            <button
              key={scen.id}
              onClick={() => handleScenarioChange(scen)}
              className={`p-4 rounded-xl border text-left transition-all space-y-2 flex flex-col justify-between ${
                isSelected
                  ? 'bg-white border-[#C85A3F] shadow-md ring-2 ring-[#C85A3F]/20'
                  : 'bg-white border-[#E2E2DC] hover:border-[#D4D4CE]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-[#C85A3F]' : 'text-[#64748B]'}`}>
                    Scenario Preset
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-[#C85A3F]" />}
                </div>
                <h4 className="text-xs font-bold text-[#1A1F26] mt-1">{scen.name}</h4>
                <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2 leading-relaxed">
                  {scen.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#E2E2DC] flex items-center justify-between text-[10px] font-mono font-semibold text-[#1A1F26]">
                <span>Demand: {scen.demandMultiplier}x</span>
                <span>Donation: {scen.donationChangePercent}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Real-time Scenario Parameters & Recalculation Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Parameter Controls */}
        <div className="p-5 rounded-xl bg-white border border-[#E2E2DC] shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-[#1A1F26] uppercase tracking-wider flex items-center gap-2 border-b border-[#E2E2DC] pb-3">
            <Layers className="w-4 h-4 text-[#64748B]" />
            Interactive Scenario Controls
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-[#1A1F26] mb-1">
                <span>Regional Demand Multiplier</span>
                <span className="font-mono text-[#C85A3F] font-bold">{demandMultiplier}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={demandMultiplier}
                onChange={e => setDemandMultiplier(parseFloat(e.target.value))}
                className="w-full accent-[#C85A3F]"
              />
              <p className="text-[10px] text-[#64748B] mt-1">1.0x = Baseline, 2.0x = +100% Mass Casualty Surge</p>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-[#1A1F26] mb-1">
                <span>Donation Supply Adjustment</span>
                <span className="font-mono text-[#BE8226] font-bold">{donationChange}%</span>
              </div>
              <input
                type="range"
                min="-60"
                max="50"
                step="5"
                value={donationChange}
                onChange={e => setDonationChange(parseInt(e.target.value))}
                className="w-full accent-[#BE8226]"
              />
              <p className="text-[10px] text-[#64748B] mt-1">Negative = Drive Cancellation / Monsoon Flooding</p>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Simulated Impact Metrics */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-[#E2E2DC] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E2DC] pb-3">
            <h3 className="text-xs font-bold text-[#1A1F26] uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#C85A3F]" />
              Digital Twin Recalculation Results
            </h3>
            {lastSimulatedTime && (
              <span className="text-[10px] font-mono text-[#2C6E49]">
                Last simulated at {lastSimulatedTime}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-lg bg-[#FDF6F0] border border-[#F3D7C8] space-y-1">
              <span className="text-[10px] font-bold text-[#C85A3F] uppercase tracking-wider">Projected Deficit</span>
              <p className="text-xl font-bold font-mono text-[#C85A3F]">{simulatedDeficit} Units</p>
              <p className="text-[10px] text-[#64748B]">Across network</p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#FAF0D6] border border-[#EAEAE5] space-y-1">
              <span className="text-[10px] font-bold text-[#BE8226] uppercase tracking-wider">At-Risk Hospitals</span>
              <p className="text-xl font-bold font-mono text-[#BE8226]">{criticalFacilitiesCount} Facilities</p>
              <p className="text-[10px] text-[#64748B]">Below safety buffer</p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#E3EFEA] border border-[#C5E1D4] space-y-1">
              <span className="text-[10px] font-bold text-[#2C6E49] uppercase tracking-wider">Safe-to-Share Margin</span>
              <p className="text-xl font-bold font-mono text-[#2C6E49]">{safeShareAvailable} Units</p>
              <p className="text-[10px] text-[#64748B]">Available for transfer</p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E2E2DC] space-y-1">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Transfers Required</span>
              <p className="text-xl font-bold font-mono text-[#1A1F26]">{transfersNeeded} Recommended</p>
              <p className="text-[10px] text-[#64748B]">Auto-generated</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
