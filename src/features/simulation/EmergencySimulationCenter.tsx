import { useState } from 'react';
import {
  Zap, AlertTriangle, ShieldCheck, RefreshCw, Play, Building2,
  TrendingUp, ArrowRight, Activity, Layers, CheckCircle2,
  Lock, Truck, FileCheck, Send, Info, Clock, Thermometer,
  ShieldAlert, UserCheck, Check,
} from 'lucide-react';
import { DEMO_SCENARIOS, DEMO_SHORTAGES, DEMO_ORGANIZATIONS, SYNTHETIC_DATA_NOTICE } from '@/lib/demo-data';
import { useAuditStore } from '@/lib/audit-store';
import { useAuthStore } from '@/lib/auth-store';
import { sendMakeWebhookNotification, MakeWebhookPayload } from '@/lib/make-webhook';
import type { SimulationScenario } from '@/types';

export function EmergencySimulationCenter() {
  const [activeTab, setActiveTab] = useState<'trichy-workflow' | 'stress-testing'>('trichy-workflow');

  // Interactive 9-step scenario state
  const [scenarioStep, setScenarioStep] = useState<number>(1);
  const [transferStatus, setTransferStatus] = useState<'UNAPPROVED' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED'>('UNAPPROVED');
  const [webhookLog, setWebhookLog] = useState<any | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Digital Twin stress-test state
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario>(DEMO_SCENARIOS[0]);
  const [demandMultiplier, setDemandMultiplier] = useState<number>(DEMO_SCENARIOS[0].demandMultiplier);
  const [donationChange, setDonationChange] = useState<number>(DEMO_SCENARIOS[0].donationChangePercent);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lastSimulatedTime, setLastSimulatedTime] = useState<string | null>(null);

  const { currentUser } = useAuthStore();
  const { logAction } = useAuditStore();

  const isUserAuthorized = currentUser.role === 'AUTHORIZED_APPROVER' || currentUser.role === 'ADMIN';

  // Handler for Step 7: Manual Transfer Approval
  const handleApproveTransfer = async () => {
    if (!isUserAuthorized) {
      setApprovalError(`Authorization Denied: Your current role (${currentUser.role}) does not hold transfer approval authority. Please switch to "Dr. Sarah Jenkins (Authorized Approver)" or "System Admin" to authorize clinical transfers.`);
      return;
    }
    setApprovalError(null);
    setIsProcessingAction(true);

    setTimeout(async () => {
      setTransferStatus('APPROVED');
      setScenarioStep(8);
      setIsProcessingAction(false);

      logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'TRANSFER_APPROVED',
        entityType: 'TRANSFER',
        entityId: 'TR-TRY-8821',
        oldValue: 'PENDING_APPROVAL',
        newValue: 'APPROVED',
        reason: 'Authorized emergency O-Negative transfer (6 units) from Central Hub to Manapparai Trauma Unit following NH 83 collision.',
      });

      // Step 9: Make.com Notification Webhook
      const dispatchResult = await sendMakeWebhookNotification({
        event: 'TRANSFER_APPROVED',
        scenarioName: 'NH 83 Highway Collision Emergency (Tiruchirappalli)',
        transferId: 'TR-TRY-8821',
        requestId: 'REQ_TRY_MANAPPARAI_001',
        sourceFacility: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
        destinationFacility: 'Manapparai Highway Trauma Unit (Simulated)',
        bloodGroup: 'O_NEGATIVE',
        componentType: 'RBC',
        units: 6,
        approverName: currentUser.name,
        approverRole: currentUser.role,
        etaMinutes: 48,
      });

      setWebhookLog(dispatchResult);
    }, 400);
  };

  // Handler for Step 8a: Controlled Dispatch Action
  const handleDispatchCourier = async () => {
    setIsProcessingAction(true);
    setTimeout(async () => {
      setTransferStatus('IN_TRANSIT');
      setIsProcessingAction(false);

      logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'TRANSFER_DISPATCHED',
        entityType: 'TRANSFER',
        entityId: 'TR-TRY-8821',
        oldValue: 'APPROVED',
        newValue: 'IN_TRANSIT',
        reason: 'Courier departure verified. Cold storage container sealed with BLE temperature logger #SENSOR_TRY_01.',
      });

      const dispatchResult = await sendMakeWebhookNotification({
        event: 'TRANSFER_DISPATCHED',
        scenarioName: 'NH 83 Highway Collision Emergency (Tiruchirappalli)',
        transferId: 'TR-TRY-8821',
        sourceFacility: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
        destinationFacility: 'Manapparai Highway Trauma Unit (Simulated)',
        bloodGroup: 'O_NEGATIVE',
        componentType: 'RBC',
        units: 6,
        etaMinutes: 48,
      });

      setWebhookLog(dispatchResult);
    }, 400);
  };

  // Handler for Step 8b: Controlled Receipt Action
  const handleConfirmReceipt = async () => {
    setIsProcessingAction(true);
    setTimeout(async () => {
      setTransferStatus('RECEIVED');
      setScenarioStep(9);
      setIsProcessingAction(false);

      logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'TRANSFER_RECEIVED',
        entityType: 'TRANSFER',
        entityId: 'TR-TRY-8821',
        oldValue: 'IN_TRANSIT',
        newValue: 'RECEIVED',
        reason: 'Units received at Manapparai. Cold-chain verified at 3.8°C. Blood added to usable inventory idempotently.',
      });

      const dispatchResult = await sendMakeWebhookNotification({
        event: 'TRANSFER_RECEIVED',
        scenarioName: 'NH 83 Highway Collision Emergency (Tiruchirappalli)',
        transferId: 'TR-TRY-8821',
        sourceFacility: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
        destinationFacility: 'Manapparai Highway Trauma Unit (Simulated)',
        bloodGroup: 'O_NEGATIVE',
        componentType: 'RBC',
        units: 6,
      });

      setWebhookLog(dispatchResult);
    }, 400);
  };

  // Stress test execution
  const handleRunStressSimulation = () => {
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
        newValue: `Scenario: ${selectedScenario.name} (Multiplier: ${demandMultiplier}x)`,
        reason: `Executed stress simulation: ${selectedScenario.description}`,
      });
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Synthetic Data Governance Header Notice */}
      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="font-bold font-mono tracking-wide">{SYNTHETIC_DATA_NOTICE}</span>
          <span className="text-amber-700 hidden md:inline">• Tiruchirappalli Regional Research Cluster</span>
        </div>
        <span className="text-[10px] font-mono text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded">
          Controlled Human Review Mandate Enforced
        </span>
      </div>

      {/* Top Selector Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tiruchirappalli Emergency Scenario & Simulation Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            End-to-end clinical workflow: O-negative shortage detection, automated delivery planning, human authorization, and automated notifications
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('trichy-workflow')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'trichy-workflow' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-red-600" />
            <span>Core Scenario: Manapparai Emergency</span>
          </button>
          <button
            onClick={() => setActiveTab('stress-testing')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'stress-testing' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>Digital Twin Stress Tester</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Core Demonstration Scenario (Tiruchirappalli NH 83 O- Deficit) */}
      {activeTab === 'trichy-workflow' && (
        <div className="space-y-6">
          {/* Scenario Overview Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600 text-white">
                    CRITICAL SCENARIO
                  </span>
                  <span className="text-xs font-mono text-slate-400">DEMO-TRY-NH83-01</span>
                </div>
                <h3 className="text-lg font-bold">
                  NH 83 Multi-Vehicle Collision — Acute O-Negative Deficit at Manapparai
                </h3>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  Mass casualty emergency trauma intake arrives at Manapparai Highway Trauma Unit (Simulated) with zero usable O-Negative PRBC units in reserve. System coordinates safe-to-share extraction from Tiruchirappalli Central Hub with mandatory human sign-off.
                </p>
              </div>

              <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800">
                  Step {scenarioStep} of 9 Completed
                </span>
                <span className="text-[10px] text-slate-400">Separate Controlled Actions</span>
              </div>
            </div>

            {/* 9-Step Progress Bar */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 text-[10px] font-mono">
                {[
                  { step: 1, label: '1. Shortage' },
                  { step: 2, label: '2. Forecast' },
                  { step: 3, label: '3. Risk Engine' },
                  { step: 4, label: '4. Safe-Share' },
                  { step: 5, label: '5. Optimizer' },
                  { step: 6, label: '6. Explanation' },
                  { step: 7, label: '7. Approval' },
                  { step: 8, label: '8. Dispatch/Receipt' },
                  { step: 9, label: '9. Notification' },
                ].map((s) => (
                  <button
                    key={s.step}
                    onClick={() => setScenarioStep(s.step)}
                    className={`p-1.5 rounded text-center transition-all ${
                      scenarioStep === s.step
                        ? 'bg-red-600 text-white font-bold ring-1 ring-white'
                        : scenarioStep > s.step
                        ? 'bg-slate-800 text-emerald-400 font-semibold'
                        : 'bg-slate-800/60 text-slate-500'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Steps Display */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Step Deep Dive */}
            <div className="lg:col-span-2 space-y-4">
              {/* Step 1: Hospital Shortage Risk */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 font-bold font-mono text-xs flex items-center justify-center">1</span>
                    <h4 className="text-sm font-bold text-slate-900">Hospital O-Negative Shortage Influx</h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    MANAPPARAI TRAUMA UNIT
                  </span>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">Current Total Stock</span>
                    <span className="text-lg font-mono font-bold text-slate-900">1 Unit</span>
                    <span className="text-[10px] text-slate-400 block">O- PRBC</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">Reserved for Active ICU</span>
                    <span className="text-lg font-mono font-bold text-amber-600">1 Unit</span>
                    <span className="text-[10px] text-slate-400 block">Locked</span>
                  </div>
                  <div className="bg-red-50 p-3 rounded-xl border border-red-200">
                    <span className="text-red-700 block text-[10px] font-bold">Net Usable Inventory</span>
                    <span className="text-lg font-mono font-bold text-red-600">0 Units</span>
                    <span className="text-[10px] text-red-600 block">CRITICAL DEFICIT</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Following an emergency mass-casualty collision on NH 83, the trauma unit requires immediate blood without warning. Available shelf stock is fully exhausted.
                </p>
              </div>

              {/* Step 2 & 3: Forecasting & Risk Engine Evaluation */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 font-bold font-mono text-xs flex items-center justify-center">2</span>
                    <h4 className="text-sm font-bold text-slate-900">Demand Forecasting & Risk Engine Projection</h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">24-Hour Lookahead</span>
                </div>

                <div className="grid sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">Predicted P50 Demand</span>
                    <span className="text-base font-mono font-bold text-slate-900">8.0 Units</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">Lower Estimate</span>
                    <span className="text-base font-mono font-bold text-slate-700">6.0 Units</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">Higher Estimate</span>
                    <span className="text-base font-mono font-bold text-slate-900">11.0 Units</span>
                  </div>
                  <div className="bg-red-50 p-3 rounded-xl border border-red-200">
                    <span className="text-red-700 block text-[10px] font-bold">Severity Level</span>
                    <span className="text-base font-mono font-bold text-red-600">CRITICAL</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 font-mono">
                  <span>Risk Metric: Coverage Ratio = 0.00 (Projected Deficit: 8.0 units O-Negative RBC).</span>
                </div>
              </div>

              {/* Step 4 & 5: Safe-to-Share Pool & Optimizer */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 font-bold font-mono text-xs flex items-center justify-center">4</span>
                    <h4 className="text-sm font-bold text-slate-900">Safe-to-Share Assessment & Automated Delivery Planning</h4>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Solver: 9.8ms Optimal
                  </span>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                        <th className="py-2 px-2">Candidate Facility</th>
                        <th className="py-2 px-2">Distance / ETA</th>
                        <th className="py-2 px-2">Total O- Stock</th>
                        <th className="py-2 px-2">Estimated Protection Requirement</th>
                        <th className="py-2 px-2">Estimated Blood Available for Sharing</th>
                        <th className="py-2 px-2 text-right">Planning Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-emerald-50/40">
                        <td className="py-2.5 px-2 font-bold text-slate-900">
                          Tiruchirappalli Central Blood Bank Hub
                        </td>
                        <td className="py-2.5 px-2 font-mono">40.2 km (48 min)</td>
                        <td className="py-2.5 px-2 font-mono font-semibold">22 units</td>
                        <td className="py-2.5 px-2 font-mono">10 units</td>
                        <td className="py-2.5 px-2 font-mono font-bold text-emerald-700">8 units</td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-700">
                          ALLOCATE 6 UNITS
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2 text-slate-700">
                          Srirangam Sub-District Hospital
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-500">48.5 km (58 min)</td>
                        <td className="py-2.5 px-2 font-mono">3 units</td>
                        <td className="py-2.5 px-2 font-mono">4 units</td>
                        <td className="py-2.5 px-2 font-mono font-bold text-red-600">0 units (Protected)</td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-400">0 Units (Blocked)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2 text-slate-700">
                          Thuvakudi Industrial Corridor Health Center
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-500">54.0 km (62 min)</td>
                        <td className="py-2.5 px-2 font-mono">4 units</td>
                        <td className="py-2.5 px-2 font-mono">3 units</td>
                        <td className="py-2.5 px-2 font-mono text-amber-600">1 unit</td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-400">0 Units (Sub-optimal)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Step 6: Explanation */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-sky-600" />
                    Explainable Optimization Rationale:
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    1. <strong>Safety Invariant Enforced:</strong> Tiruchirappalli Central Hub holds 22 units of O-Negative with an estimated protection requirement of 10 units. Extracting 6 units leaves a safe reserve of 16 units, avoiding secondary shortages.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    2. <strong>Deficit Protection:</strong> Srirangam Hospital has 0 units available for sharing; extracting blood would cause a secondary shortage, so it was not selected.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    3. <strong>Route Feasibility:</strong> Direct transit via NH 83 highway requires ~48 minutes, well within the 120-minute cold-chain limit. <span className="text-amber-700 italic">(Demonstration route information — not live navigation.)</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Controlled Human Review & Execution (Steps 7, 8, 9) */}
            <div className="space-y-4">
              {/* Step 7: Authorization Panel */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-red-600" />
                    7. Manual Human Review
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    transferStatus === 'UNAPPROVED' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {transferStatus === 'UNAPPROVED' ? 'PENDING APPROVAL' : 'AUTHORIZED'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Active User:</span>
                    <span className="font-bold text-slate-900">{currentUser.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Authorization Role:</span>
                    <span className="font-mono font-bold text-red-600">{currentUser.role}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Transfer Manifest:</span>
                    <span className="font-mono font-bold text-slate-900">TR-TRY-8821 (6 Units O-)</span>
                  </div>
                </div>

                {approvalError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] leading-relaxed">
                    {approvalError}
                  </div>
                )}

                {transferStatus === 'UNAPPROVED' ? (
                  <button
                    onClick={handleApproveTransfer}
                    disabled={isProcessingAction}
                    className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 active:bg-red-800 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Authorize Emergency Transfer
                  </button>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Transfer authorized by {currentUser.name} ({currentUser.role}).</span>
                  </div>
                )}
              </div>

              {/* Step 8: Decoupled Dispatch and Receipt */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-sky-600" />
                    8. Controlled Logistics Actions
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Dispatch and receipt remain separate controlled steps.
                  </p>
                </div>

                {/* Dispatch Button */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">Dispatch Step:</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {transferStatus === 'UNAPPROVED' ? 'Awaiting Approval' :
                       transferStatus === 'APPROVED' ? 'Ready to Dispatch' : 'Dispatched'}
                    </span>
                  </div>

                  <button
                    onClick={handleDispatchCourier}
                    disabled={transferStatus !== 'APPROVED' || isProcessingAction}
                    className="w-full py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Truck className="w-4 h-4" />
                    Confirm Courier Dispatch (Central Hub)
                  </button>
                </div>

                {/* Receipt Button */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">Destination Receipt:</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {transferStatus === 'RECEIVED' ? 'Verified & Stored' :
                       transferStatus === 'IN_TRANSIT' ? 'En Route via NH 83' : 'Pending Transit'}
                    </span>
                  </div>

                  <button
                    onClick={handleConfirmReceipt}
                    disabled={transferStatus !== 'IN_TRANSIT' || isProcessingAction}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Destination Receipt (Manapparai)
                  </button>
                </div>
              </div>

              {/* Step 9: Make.com Notification Log */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-purple-600" />
                    9. Make.com Webhook Stream
                  </span>
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    Notification Bus
                  </span>
                </div>

                {webhookLog ? (
                  <div className="space-y-2 text-[11px] font-mono bg-slate-900 text-slate-200 p-3 rounded-xl overflow-x-auto">
                    <p className="text-emerald-400 font-bold">✓ {webhookLog.message}</p>
                    <div className="text-slate-400 text-[10px] space-y-0.5 pt-1 border-t border-slate-800">
                      <p>Event: {webhookLog.payload.event}</p>
                      <p>Transfer: {webhookLog.payload.transferId}</p>
                      <p>Units: {webhookLog.payload.units} {webhookLog.payload.bloodGroup} {webhookLog.payload.componentType}</p>
                      <p>Timestamp: {webhookLog.payload.timestamp}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Execute scenario actions above to view Make.com webhook delivery payloads.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Digital Twin Parameter Stress Tester */}
      {activeTab === 'stress-testing' && (
        <div className="space-y-6">
          {/* Preset Scenarios Selector */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {DEMO_SCENARIOS.map(scen => {
              const isSelected = selectedScenario.id === scen.id;
              return (
                <button
                  key={scen.id}
                  onClick={() => {
                    setSelectedScenario(scen);
                    setDemandMultiplier(scen.demandMultiplier);
                    setDonationChange(scen.donationChangePercent);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all space-y-2 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white border-red-500 shadow-sm ring-2 ring-red-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-red-600' : 'text-slate-500'}`}>
                        Scenario Preset
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-1">{scen.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {scen.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono font-semibold text-slate-800">
                    <span>Demand: {scen.demandMultiplier}x</span>
                    <span>Donation: {scen.donationChangePercent}%</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Controls & Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Layers className="w-4 h-4 text-slate-500" />
                Stress Test Parameter Tuning
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between font-semibold text-slate-800 mb-1">
                    <span>Demand Surge Multiplier</span>
                    <span className="font-mono text-red-600 font-bold">{demandMultiplier}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={demandMultiplier}
                    onChange={e => setDemandMultiplier(parseFloat(e.target.value))}
                    className="w-full accent-red-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-slate-800 mb-1">
                    <span>Donation Volume Shift</span>
                    <span className="font-mono text-amber-600 font-bold">{donationChange}%</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="50"
                    step="5"
                    value={donationChange}
                    onChange={e => setDonationChange(parseInt(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                </div>

                <button
                  onClick={handleRunStressSimulation}
                  disabled={isRunning}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                  Execute Stress Test Drill
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-600" />
                  Regional Resilience Impact Projection
                </h3>
                {lastSimulatedTime && (
                  <span className="text-[10px] font-mono text-emerald-700">
                    Last simulated: {lastSimulatedTime}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl">
                  <span className="text-xs text-slate-500 block">Projected Deficit</span>
                  <span className="text-2xl font-mono font-bold text-red-600">
                    {(8.0 * demandMultiplier * (1 - donationChange / 100)).toFixed(1)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">units across Trichy</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <span className="text-xs text-slate-500 block">At-Risk Nodes</span>
                  <span className="text-2xl font-mono font-bold text-slate-900">
                    {Math.min(5, Math.max(1, Math.round(1 * demandMultiplier)))}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">of 8 regional facilities</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <span className="text-xs text-slate-500 block">Safe-to-Share Pool</span>
                  <span className="text-2xl font-mono font-bold text-emerald-600">
                    {Math.max(0, Math.round(79 / demandMultiplier))}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">units available</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <span className="text-xs text-slate-500 block">Transfers Needed</span>
                  <span className="text-2xl font-mono font-bold text-sky-600">
                    {Math.round(8.0 * demandMultiplier * 0.7)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">dispatch legs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
