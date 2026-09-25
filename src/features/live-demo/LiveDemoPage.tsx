import { useState } from 'react';
import {
  Zap, AlertTriangle, ShieldCheck, RefreshCw, Play, Building2,
  TrendingUp, ArrowRight, Activity, Layers, CheckCircle2,
  Lock, Truck, FileCheck, Send, Info, Clock, Thermometer,
  ShieldAlert, UserCheck, Check, PlusCircle, PackageCheck, Eye,
  Award, Sparkles, FileText, Share2, ArrowUpRight, Droplets
} from 'lucide-react';
import { DEMO_ORGANIZATIONS, SYNTHETIC_DATA_NOTICE } from '@/lib/demo-data';
import { useAuthStore } from '@/lib/auth-store';
import { useAuditStore } from '@/lib/audit-store';
import { useRequestsStore, PlainTransferRequest } from '@/lib/requests-store';
import { formatBloodGroup, COMPONENT_LABELS, cn } from '@/lib/utils';
import type { BloodGroup, ComponentType } from '@/types';

export function LiveDemoPage() {
  const { currentUser, switchRole, canApproveTransfer, canStartTransport, canConfirmReceipt } = useAuthStore();
  const { logAction, logs } = useAuditStore();
  const {
    requests,
    activeLiveDemoRequestId,
    addRequest,
    approveRequest,
    rejectRequest,
    dispatchRequest,
    receiveRequest,
    setActiveLiveDemoRequestId,
    resetToInitial,
  } = useRequestsStore();

  // Selected Active Request in Demo
  const activeReq = requests.find(r => r.id === activeLiveDemoRequestId) || requests[0];

  // Demo Wizard Step (1: Request, 2: Accept, 3: Dispatch, 4: Complete)
  const [demoStep, setDemoStep] = useState<number>(() => {
    if (!activeReq) return 1;
    if (activeReq.status === 'PENDING_APPROVAL') return 2;
    if (activeReq.status === 'APPROVED') return 3;
    if (activeReq.status === 'IN_TRANSIT') return 3;
    if (activeReq.status === 'RECEIVED') return 4;
    return 1;
  });

  // Custom Form State for New Live Request
  const [sourceId, setSourceId] = useState('SIM_BB_TRY_CENTRAL');
  const [destId, setDestId] = useState('SIM_HOSP_MANAPPARAI');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O_NEGATIVE');
  const [componentType, setComponentType] = useState<ComponentType>('RBC');
  const [quantity, setQuantity] = useState<number>(4);
  const [priority, setPriority] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY'>('EMERGENCY');
  const [clinicalReason, setClinicalReason] = useState(
    'Acute O- PRBC deficit following NH 83 highway multi-vehicle collision with 3 critical trauma patients needing emergency blood.'
  );

  // Approval Custom Notes
  const [approvalNote, setApprovalNote] = useState('Clinical authorization granted by Dr. Sarah Jenkins. Safe reserve verified at sender hub.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const facilities = DEMO_ORGANIZATIONS.filter(o => o.type === 'HOSPITAL' || o.type === 'BLOOD_BANK');

  // Trigger Preset Quick Actions
  const handleLoadPreset = async (type: 'EMERGENCY_O_NEG' | 'URGENT_A_NEG' | 'ROUTINE_B_POS') => {
    if (type === 'EMERGENCY_O_NEG') {
      const newReq: PlainTransferRequest = {
        id: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
        sourceFacilityId: 'SIM_BB_TRY_CENTRAL',
        sourceFacilityName: 'Tiruchirappalli Central Blood Bank Hub',
        destinationFacilityId: 'SIM_HOSP_MANAPPARAI',
        destinationFacilityName: 'Manapparai Highway Trauma Unit',
        bloodGroup: 'O_NEGATIVE',
        componentType: 'RBC',
        quantity: 4,
        availableToShare: 16,
        priority: 'EMERGENCY',
        status: 'PENDING_APPROVAL',
        reason: 'Acute O- deficit for trauma patient in operating theater after NH 83 highway crash.',
        requestedBy: 'Dr. Rajesh Kumar (Manapparai Trauma)',
        aiMatchScore: 98.6,
      };
      await addRequest(newReq);
      setDemoStep(2);
      setFeedback({ type: 'success', text: 'Emergency O− Blood Request created and registered in database.' });
    } else if (type === 'URGENT_A_NEG') {
      const newReq: PlainTransferRequest = {
        id: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
        sourceFacilityId: 'SIM_BB_TRY_CENTRAL',
        sourceFacilityName: 'Tiruchirappalli Central Blood Bank Hub',
        destinationFacilityId: 'SIM_HOSP_SRIRANGAM',
        destinationFacilityName: 'Srirangam Sub-Divisional Hospital',
        bloodGroup: 'A_NEGATIVE',
        componentType: 'RBC',
        quantity: 3,
        availableToShare: 12,
        priority: 'URGENT',
        status: 'PENDING_APPROVAL',
        reason: 'Emergency obstetric hemorrhage case in maternity surgical suite.',
        requestedBy: 'Dr. Sarah Jenkins',
        aiMatchScore: 95.2,
      };
      await addRequest(newReq);
      setDemoStep(2);
      setFeedback({ type: 'success', text: 'Urgent A− Blood Request created and registered in database.' });
    } else {
      const newReq: PlainTransferRequest = {
        id: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
        sourceFacilityId: 'SIM_HOSP_THUVAKUDI',
        sourceFacilityName: 'Thuvakudi Industrial Corridor Health Center',
        destinationFacilityId: 'SIM_BB_TRY_CENTRAL',
        destinationFacilityName: 'Tiruchirappalli Central Blood Bank Hub',
        bloodGroup: 'B_POSITIVE',
        componentType: 'PLATELETS',
        quantity: 5,
        availableToShare: 10,
        priority: 'ROUTINE',
        status: 'PENDING_APPROVAL',
        reason: 'Stock rebalancing for high-throughput regional blood bank hub.',
        requestedBy: 'Ananya Roy (Blood Bank Staff)',
        aiMatchScore: 92.4,
      };
      await addRequest(newReq);
      setDemoStep(2);
      setFeedback({ type: 'success', text: 'Routine B+ Platelet Rebalance request created and registered in database.' });
    }
  };

  // 1. Submit Request Handler
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const sourceFac = facilities.find(f => f.id === sourceId);
    const destFac = facilities.find(f => f.id === destId);

    const newReq: PlainTransferRequest = {
      id: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
      sourceFacilityId: sourceId,
      sourceFacilityName: sourceFac?.name || 'Selected Hub',
      destinationFacilityId: destId,
      destinationFacilityName: destFac?.name || 'Selected Hospital',
      bloodGroup,
      componentType,
      quantity,
      availableToShare: 16,
      priority,
      status: 'PENDING_APPROVAL',
      reason: clinicalReason,
      requestedBy: `${currentUser.name} (${currentUser.role.replace('_', ' ')})`,
      aiMatchScore: Math.floor(94 + Math.random() * 5.5 * 10) / 10,
    };

    await addRequest(newReq);
    setDemoStep(2);
    setFeedback({
      type: 'success',
      text: `Blood Request created and registered in database! Proceed to Step 2 to approve request as Authorized Approver.`
    });
  };

  // 2. Accept Request Handler
  const handleAcceptRequest = async () => {
    if (!activeReq) return;
    if (!canApproveTransfer()) {
      switchRole('AUTHORIZED_APPROVER');
      setFeedback({
        type: 'error',
        text: 'Switched active role to Authorized Approver. Click Approve Blood Request again!'
      });
      return;
    }

    setIsProcessing(true);
    await approveRequest(activeReq.id, currentUser.name, approvalNote);
    setIsProcessing(false);
    setDemoStep(3);
    setFeedback({
      type: 'success',
      text: `Request ${activeReq.id} approved by ${currentUser.name}. Digital approval certificate generated.`
    });
  };

  // 3. Dispatch Logistics Handler
  const handleDispatch = async () => {
    if (!activeReq) return;
    setIsProcessing(true);
    await dispatchRequest(activeReq.id);
    setIsProcessing(false);
    setFeedback({
      type: 'success',
      text: `Courier dispatched for ${activeReq.id}. Cold-chain temperature monitoring active.`
    });
  };

  // 4. Confirm Delivery Handler
  const handleConfirmDelivery = async () => {
    if (!activeReq) return;
    setIsProcessing(true);
    await receiveRequest(activeReq.id);
    setIsProcessing(false);
    setDemoStep(4);
    setFeedback({
      type: 'success',
      text: `Transfer ${activeReq.id} received and completed. Facility inventory synchronized.`
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner / Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#841A2B] via-[#701524] to-stone-900 text-white shadow-xl relative overflow-hidden">
        {/* Background glow graphics */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 top-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-amber-300">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-300/30">
                    OPERATIONAL WORKFLOW CENTER
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    WORKFLOW ACTIVE
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight mt-1">
                  Blood Request & Approval
                </h1>
              </div>
            </div>

            {/* Reset Workflow */}
            <button
              type="button"
              onClick={() => {
                resetToInitial();
                setDemoStep(1);
                setFeedback({ type: 'success', text: 'Workflow state reset.' });
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Workflow
            </button>
          </div>

          <p className="text-xs sm:text-sm text-stone-200 max-w-3xl leading-relaxed">
            Manage the complete blood coordination workflow: request blood, evaluate compatible inventory, authorize allocation, coordinate transfer, track delivery, and synchronize inventory.
          </p>

          {/* Quick Actions */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-stone-300 font-semibold text-[11px] uppercase tracking-wider">QUICK ACTIONS:</span>
            <button
              type="button"
              onClick={() => handleLoadPreset('EMERGENCY_O_NEG')}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              Create Emergency O− Request
            </button>
            <button
              type="button"
              onClick={() => handleLoadPreset('URGENT_A_NEG')}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              Create Urgent A− Request
            </button>
            <button
              type="button"
              onClick={() => handleLoadPreset('ROUTINE_B_POS')}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5"
            >
              <Droplets className="w-3.5 h-3.5 text-sky-300" />
              Create Routine B+ Request
            </button>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div className={cn(
          'p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-sm transition-all',
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
        )}>
          <div className="flex items-center gap-2 font-medium">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />}
            <span>{feedback.text}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-700">✕</button>
        </div>
      )}

      {/* Stepper Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { step: 1, title: '1. Request Blood', desc: 'Hospital / Requester Submission', icon: PlusCircle },
          { step: 2, title: '2. Approve Request', desc: 'Authorized Approver', icon: ShieldCheck },
          { step: 3, title: '3. Dispatch Transfer', desc: 'Logistics / Blood Bank', icon: Truck },
          { step: 4, title: '4. Receive & Synchronize', desc: 'Destination Facility', icon: PackageCheck },
        ].map((s) => {
          const isActive = demoStep === s.step;
          const isDone = demoStep > s.step || (s.step === 2 && activeReq?.status !== 'PENDING_APPROVAL') || (s.step === 3 && (activeReq?.status === 'IN_TRANSIT' || activeReq?.status === 'RECEIVED')) || (s.step === 4 && activeReq?.status === 'RECEIVED');
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setDemoStep(s.step)}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between space-y-2',
                isActive
                  ? 'bg-white border-[#841A2B] ring-2 ring-[#841A2B]/20 shadow-md'
                  : isDone
                  ? 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300'
                  : 'bg-white/80 border-stone-200 hover:border-stone-300'
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  'w-7 h-7 rounded-xl flex items-center justify-center text-xs font-mono font-bold',
                  isActive ? 'bg-[#841A2B] text-white' : isDone ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600'
                )}>
                  {isDone && !isActive ? '✓' : s.step}
                </span>
                <s.icon className={cn('w-4 h-4', isActive ? 'text-[#841A2B]' : isDone ? 'text-emerald-600' : 'text-stone-400')} />
              </div>

              <div>
                <p className={cn('text-xs font-bold', isActive ? 'text-stone-900' : 'text-stone-700')}>{s.title}</p>
                <p className="text-[10px] text-stone-500 mt-0.5">{s.desc}</p>
              </div>

              {isActive && (
                <div className="h-1 bg-[#841A2B] w-full rounded-full absolute bottom-0 left-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Grid: Interactive Step Engine + Live Manifest Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Step Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: REQUEST BLOOD FORM */}
          {demoStep === 1 && (
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900 flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-[#841A2B]" />
                    Step 1: Request Blood Units
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Submit a real-time inter-facility blood transfer request for clinical evaluation.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                  REQUESTER STAGE
                </span>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-stone-700">Sending Facility (Source Hub)</label>
                    <select
                      value={sourceId}
                      onChange={e => setSourceId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-xs font-medium text-stone-900"
                    >
                      {facilities.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-stone-700">Receiving Facility (Destination Hospital)</label>
                    <select
                      value={destId}
                      onChange={e => setDestId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-xs font-medium text-stone-900"
                    >
                      {facilities.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-stone-700">Blood Group</label>
                    <select
                      value={bloodGroup}
                      onChange={e => setBloodGroup(e.target.value as BloodGroup)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-xs font-bold text-stone-900"
                    >
                      {['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'].map(bg => (
                        <option key={bg} value={bg}>{formatBloodGroup(bg as BloodGroup)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-stone-700">Component</label>
                    <select
                      value={componentType}
                      onChange={e => setComponentType(e.target.value as ComponentType)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-xs font-medium text-stone-900"
                    >
                      {['RBC', 'PLATELETS', 'PLASMA', 'WHOLE_BLOOD', 'CRYOPRECIPITATE'].map(c => (
                        <option key={c} value={c}>{COMPONENT_LABELS[c as ComponentType]}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-stone-700">Quantity (Units)</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={quantity}
                      onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-xs font-mono font-bold text-[#841A2B]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Clinical Urgency Priority</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['EMERGENCY', 'URGENT', 'ROUTINE'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={cn(
                          'py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center',
                          priority === p
                            ? p === 'EMERGENCY' ? 'bg-red-600 text-white border-red-600 shadow-xs' : p === 'URGENT' ? 'bg-amber-500 text-white border-amber-500 shadow-xs' : 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Clinical Reason & Patient Intake Detail</label>
                  <textarea
                    rows={2}
                    value={clinicalReason}
                    onChange={e => setClinicalReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-xs text-stone-900"
                    placeholder="Provide clinical details requiring blood units..."
                  />
                </div>

                {/* AI Matching Engine Recommendation Preview */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#841A2B]" />
                      Real-Time AI Safety & Feasibility Score
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      98.6% OPTIMAL MATCH
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-stone-200">
                      <span className="text-stone-400 block text-[10px]">Source Available</span>
                      <span className="font-mono font-bold text-stone-800">16 units</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-stone-200">
                      <span className="text-stone-400 block text-[10px]">Cold Storage Reserve</span>
                      <span className="font-mono font-bold text-emerald-600">12 units safe</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-stone-200">
                      <span className="text-stone-400 block text-[10px]">Transit Feasibility</span>
                      <span className="font-mono font-bold text-sky-600">~38 mins (NH 83)</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#841A2B] hover:bg-[#701524] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit Live Blood Request
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: APPROVE REQUEST */}
          {demoStep === 2 && (
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Step 2: Approve Blood Request
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Review clinical request details and grant sign-off as Authorized Approver.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  CLINICAL APPROVAL STAGE
                </span>
              </div>

              {/* Active Approver Banner */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#841A2B] text-white font-bold flex items-center justify-center text-xs">
                    SJ
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900">{currentUser.name}</span>
                      <span className="text-[10px] font-mono font-bold uppercase bg-stone-200 text-stone-800 px-2 py-0.5 rounded">
                        {currentUser.role}
                      </span>
                    </div>
                    <p className="text-stone-600 text-[11px] mt-0.5">
                      {canApproveTransfer()
                        ? '✓ You have clinical authority to evaluate and approve this transfer request.'
                        : '⚠️ Role does not hold approval rights. Switch to Authorized Approver below.'}
                    </p>
                  </div>
                </div>

                {!canApproveTransfer() && (
                  <button
                    type="button"
                    onClick={() => switchRole('AUTHORIZED_APPROVER')}
                    className="px-3 py-1.5 rounded-lg bg-[#841A2B] text-white text-xs font-bold hover:bg-[#701524] transition-colors"
                  >
                    Switch to Approver Role
                  </button>
                )}
              </div>

              {/* Manifest Card To Accept */}
              {activeReq ? (
                <div className="p-5 rounded-2xl border border-stone-200 bg-stone-50 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-900 bg-white px-2.5 py-1 rounded border border-stone-200">
                        {activeReq.id}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-700">
                        {activeReq.priority} PRIORITY
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      PENDING APPROVAL
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase font-semibold block">Source Facility</span>
                      <p className="font-bold text-stone-900">{activeReq.sourceFacilityName}</p>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase font-semibold block">Destination Facility</span>
                      <p className="font-bold text-stone-900">{activeReq.destinationFacilityName}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase font-semibold">Blood Product Requested</span>
                      <p className="font-bold text-stone-900">
                        {formatBloodGroup(activeReq.bloodGroup)} • {COMPONENT_LABELS[activeReq.componentType]}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-stone-400 text-[10px] uppercase font-semibold">Quantity</span>
                      <p className="font-mono font-bold text-[#841A2B] text-base">{activeReq.quantity} units</p>
                    </div>
                  </div>

                  <p className="text-xs text-stone-700 italic bg-white p-3 rounded-xl border border-stone-200/80">
                    "{activeReq.reason}"
                  </p>

                  <div className="space-y-1">
                    <label className="font-semibold text-stone-700 text-xs">Approver Sign-off Note</label>
                    <input
                      type="text"
                      value={approvalNote}
                      onChange={e => setApprovalNote(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900"
                    />
                  </div>

                  {activeReq.status === 'PENDING_APPROVAL' ? (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          rejectRequest(activeReq.id, 'Clinical rejection: insufficient local backup reserve.');
                          setFeedback({ type: 'error', text: `Request ${activeReq.id} rejected.` });
                        }}
                        className="flex-1 py-3 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-red-50 hover:text-red-700 transition-all"
                      >
                        Reject Request
                      </button>
                      <button
                        type="button"
                        onClick={handleAcceptRequest}
                        disabled={isProcessing}
                        className="flex-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Approve Blood Request
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Approved by {activeReq.approvedBy || currentUser.name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-700">{activeReq.approvedAt}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-stone-500">No active request to approve. Return to Step 1 to create one.</p>
              )}
            </div>
          )}

          {/* STEP 3: COLD-CHAIN LOGISTICS DISPATCH */}
          {demoStep === 3 && (
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-sky-600" />
                    Step 3: Cold-Chain Courier Dispatch & GPS Tracking
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Initiate cold-chain courier transport and monitor temperature telemetry.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                  LOGISTICS STAGE
                </span>
              </div>

              {activeReq && (
                <div className="space-y-4">
                  {/* Courier Telemetry Control Panel */}
                  <div className="p-5 rounded-2xl bg-stone-900 text-white space-y-4 shadow-md">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                        <span className="font-bold text-xs">Courier Unit #TRY-441 (Kaveri Logistics)</span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400">BLE Logger Active</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700">
                        <span className="text-stone-400 text-[10px] block">Cold-Chain Temp</span>
                        <span className="text-xl font-mono font-bold text-emerald-400">3.8°C</span>
                        <span className="text-[10px] text-stone-400 block">Nominal (2°C - 6°C)</span>
                      </div>
                      <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700">
                        <span className="text-stone-400 text-[10px] block">Estimated Transit Time</span>
                        <span className="text-xl font-mono font-bold text-sky-400">35 Minutes</span>
                        <span className="text-[10px] text-stone-400 block">NH 83 Express Corridor</span>
                      </div>
                      <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700">
                        <span className="text-stone-400 text-[10px] block">Ledger Status</span>
                        <span className="text-xs font-mono font-bold text-amber-400 truncate block">
                          {activeReq.status}
                        </span>
                        <span className="text-[10px] text-stone-400 block">Signed Hash Ready</span>
                      </div>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-[11px] text-stone-400">
                        <span>{activeReq.sourceFacilityName}</span>
                        <span>{activeReq.destinationFacilityName}</span>
                      </div>
                      <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-1000"
                          style={{ width: activeReq.status === 'RECEIVED' ? '100%' : activeReq.status === 'IN_TRANSIT' ? '65%' : '15%' }}
                        />
                      </div>
                    </div>

                    {/* Action buttons based on status */}
                    <div className="flex items-center gap-3 pt-2">
                      {activeReq.status === 'APPROVED' && (
                        <button
                          type="button"
                          onClick={handleDispatch}
                          disabled={isProcessing}
                          className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                        >
                          {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                          Confirm Dispatch Courier Departure
                        </button>
                      )}

                      {activeReq.status === 'IN_TRANSIT' && (
                        <button
                          type="button"
                          onClick={handleConfirmDelivery}
                          disabled={isProcessing}
                          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                        >
                          {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                          Confirm Destination Delivery & Intake
                        </button>
                      )}

                      {activeReq.status === 'RECEIVED' && (
                        <div className="w-full p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-bold text-center">
                          ✓ Cold-Chain Delivery Completed & Verified at Destination
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: CONFIRM DELIVERY & INVENTORY SYNC */}
          {demoStep === 4 && (
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-600" />
                    Step 4: Receive & Synchronize
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    End-to-end blood transfer completed with idempotent ledger updates.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  WORKFLOW VERIFIED
                </span>
              </div>

              {activeReq && (
                <div className="space-y-4">
                  {/* Summary Certificate */}
                  <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-stone-900 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-6 h-6 text-emerald-700" />
                        <div>
                          <p className="font-bold text-sm">BloodChain Operations — Transfer Settlement Record</p>
                          <p className="text-[11px] text-emerald-800">Verified Clinical Execution Certificate</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-white px-2.5 py-1 rounded border border-emerald-200">
                        {activeReq.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-emerald-200/60">
                      <div>
                        <span className="text-stone-500 text-[10px] block">Requested Units</span>
                        <span className="font-bold text-stone-900">{activeReq.quantity} units {formatBloodGroup(activeReq.bloodGroup)}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 text-[10px] block">Approved By</span>
                        <span className="font-bold text-emerald-800">{activeReq.approvedBy || currentUser.name}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 text-[10px] block">Cold-Chain Status</span>
                        <span className="font-bold text-sky-800">3.8°C Verified</span>
                      </div>
                      <div>
                        <span className="text-stone-500 text-[10px] block">Inventory Sync</span>
                        <span className="font-bold text-emerald-700">Idempotent Settlement</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-emerald-200 text-[11px] font-mono space-y-1">
                      <p className="text-stone-500 font-sans font-bold">Cryptographic Ledger Hash:</p>
                      <p className="text-emerald-900 break-all">{activeReq.blockchainHash}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          resetToInitial();
                          setDemoStep(1);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#841A2B] hover:bg-[#701524] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Initiate Another Transfer Request
                      </button>

                      <a
                        href="/requests"
                        className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Transfers Table
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Live Request Status & Audit Trail */}
        <div className="lg:col-span-4 space-y-5">
          {/* Active Request Details */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-stone-100">
              <Eye className="w-4 h-4 text-[#841A2B]" />
              ACTIVE REQUEST DETAILS
            </h4>

            {activeReq ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                  <span className="font-mono font-bold text-stone-900">{activeReq.id}</span>
                  <span className={cn(
                    'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border',
                    activeReq.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                    activeReq.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    activeReq.status === 'IN_TRANSIT' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                    'bg-stone-100 text-stone-800 border-stone-200'
                  )}>
                    {activeReq.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1.5 text-stone-600">
                  <p><strong>From:</strong> {activeReq.sourceFacilityName}</p>
                  <p><strong>To:</strong> {activeReq.destinationFacilityName}</p>
                  <p><strong>Product:</strong> <span className="font-bold text-stone-900">{formatBloodGroup(activeReq.bloodGroup)} ({activeReq.quantity} units)</span></p>
                  <p><strong>Requested By:</strong> {activeReq.requestedBy}</p>
                  {activeReq.approvedBy && (
                    <p className="text-emerald-700 font-semibold"><strong>Approved By:</strong> {activeReq.approvedBy}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-stone-100 text-[10px] text-stone-400 font-mono">
                  AI Match Confidence: {activeReq.aiMatchScore}%
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-400">No request selected.</p>
            )}
          </div>

          {/* System Audit Trail */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-stone-100">
              <Activity className="w-4 h-4 text-emerald-600" />
              SYSTEM AUDIT TRAIL
            </h4>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
              {logs.slice(0, 5).map(log => (
                <div key={log.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono font-bold text-stone-900">{log.action}</span>
                    <span className="text-stone-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] text-stone-600 line-clamp-2">{log.reason}</p>
                  <span className="text-[9px] text-[#841A2B] font-semibold block">{log.userName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
