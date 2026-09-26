import { useState, useMemo } from 'react';
import {
  History, Filter, Search, UserCheck, Bot, CheckCircle2,
  ChevronDown, AlertTriangle, ShieldCheck, ArrowRight,
  Info, Sparkles, Clock, AlertCircle, RefreshCw, FileCheck
} from 'lucide-react';
import { useAuditStore } from '@/lib/audit-store';
import { cn } from '@/lib/utils';
import type { AuditLogEntry, UserRole } from '@/types';

interface ResolvedEvent {
  title: string;
  performer: string;
  performerType: 'AUTOMATED' | 'HUMAN';
  category: string;
  explanation: string;
  additionalNote?: string;
  statusBadge: { label: string; style: string };
  isSimulated: boolean;
  dateStr: string;
  relativeTime: string;
}

function formatFriendlyRole(role: string): string {
  switch (role) {
    case 'AUTHORIZED_APPROVER':
      return 'Authorized Approver';
    case 'HOSPITAL_STAFF':
      return 'Hospital Staff';
    case 'BLOOD_BANK_STAFF':
      return 'Blood Bank Staff';
    case 'LOGISTICS_STAFF':
      return 'Logistics Staff';
    case 'ADMIN':
      return 'Administrator';
    default:
      return role.replace(/_/g, ' ');
  }
}

function sanitizeTechnicalText(text: string): string {
  if (!text) return text;
  return text
    .replace(/XGBoost Forecasting Engine/gi, 'Automated Demand Estimation System')
    .replace(/XGBoost/gi, 'Automated Demand Estimation System')
    .replace(/Uncertainty Risk Engine/gi, 'Automated Stock Monitoring System')
    .replace(/Risk Engine/gi, 'Stock Monitoring System')
    .replace(/OR-Tools Allocation Solver/gi, 'Automated Delivery Planning System')
    .replace(/OR-Tools/gi, 'Automated Delivery Planning System')
    .replace(/Allocation Solver/gi, 'Delivery Planning System')
    .replace(/P90 protection level/gi, 'estimated protection requirement')
    .replace(/P90 demand/gi, 'estimated protection requirement')
    .replace(/P90/gi, 'estimated protection level')
    .replace(/safe-to-share units/gi, 'estimated blood available for sharing')
    .replace(/safe-to-share/gi, 'safe sharing')
    .replace(/AUTHORIZED_APPROVER/g, 'Authorized Approver')
    .replace(/HOSPITAL_STAFF/g, 'Hospital Staff')
    .replace(/BLOOD_BANK_STAFF/g, 'Blood Bank Staff')
    .replace(/LOGISTICS_STAFF/g, 'Logistics Staff')
    .replace(/ADMIN/g, 'Administrator');
}

function resolveEventDisplay(log: AuditLogEntry): ResolvedEvent {
  let title = log.displayTitle || '';
  let performer = log.displayPerformer || '';
  let category = log.displayCategory || '';
  let explanation = log.displayExplanation || log.reason || '';
  let additionalNote = log.displayNote;
  let statusBadge = { label: 'Recorded Action', style: 'bg-stone-50 text-stone-700 border-stone-200' };
  const isSimulated = log.isDemonstration !== false; // all demo events in the sandbox are simulated
  let performerType: 'AUTOMATED' | 'HUMAN' = 'HUMAN';

  const isAutomated =
    log.userId.startsWith('SYS_') ||
    log.userName.includes('System') ||
    log.userName.includes('Engine') ||
    log.userName.includes('Solver') ||
    log.userName.includes('XGBoost') ||
    log.userName.includes('OR-Tools') ||
    log.action === 'PREDICTION_GENERATED' ||
    log.action === 'SHORTAGE_FLAGGED' ||
    log.action === 'RECOMMENDATION_CREATED';

  if (isAutomated) {
    performerType = 'AUTOMATED';
  }

  // Resolve performer name
  if (!performer) {
    if (log.userName.includes('XGBoost') || log.userId === 'SYS_ML_ENGINE') {
      performer = 'Automated Demand Estimation System';
    } else if (log.userName.includes('Uncertainty') || log.userName.includes('Risk Engine') || log.userId === 'SYS_SHORTAGE_ENGINE') {
      performer = 'Automated Stock Monitoring System';
    } else if (log.userName.includes('OR-Tools') || log.userName.includes('Allocation Solver') || log.userId === 'SYS_OPTIMIZER') {
      performer = 'Automated Delivery Planning System';
    } else if (log.userRole === 'ADMIN' && isAutomated) {
      performer = 'Recorded by the System';
    } else {
      const friendlyRole = formatFriendlyRole(log.userRole);
      performer = `${log.userName} - ${friendlyRole}`;
    }
  }

  // Resolve title, category, statusBadge, explanation, notes
  switch (log.action) {
    case 'PREDICTION_GENERATED':
      if (!title) title = 'Blood Demand Estimate Created';
      if (!category) category = 'Demand Estimate';
      statusBadge = { label: 'Estimate Created', style: 'bg-sky-50 text-sky-800 border-sky-200' };
      if (!explanation || explanation.includes('Routine 72-hour')) {
        explanation = 'The system created an estimate of the blood units that may be needed over the next 72 hours using available demonstration information.';
      }
      if (!additionalNote) {
        additionalNote = 'Demonstration estimate - not medically validated.';
      }
      break;

    case 'SHORTAGE_FLAGGED':
      if (!title) title = 'Blood Stock May Be Low';
      if (!category) category = 'Stock Warning';
      statusBadge = { label: 'Stock Warning', style: 'bg-amber-50 text-amber-800 border-amber-200' };
      if (!explanation || explanation.includes('P90')) {
        explanation = "Metro General Hospital's O-positive red blood cell stock may be below the amount needed for expected demand.";
      }
      if (!additionalNote) {
        additionalNote = 'Estimated requirement: 37 units of O-positive red blood cells (O+)';
      }
      break;

    case 'RECOMMENDATION_CREATED':
      if (!title) title = 'Blood Sharing Recommendation Created';
      if (!category) category = 'Sharing Recommendation';
      statusBadge = { label: 'Recommendation Created', style: 'bg-purple-50 text-purple-800 border-purple-200' };
      if (!explanation || explanation.includes('P90') || explanation.includes('safe-to-share')) {
        explanation = 'Northern Blood Bank has an estimated 48 units available above its local protection requirement.';
      }
      if (!additionalNote) {
        additionalNote = 'This is a system recommendation. An authorized person must review and approve the request before any blood is moved.';
      }
      break;

    case 'TRANSFER_APPROVED':
      if (!title) title = 'Blood Transfer Approved';
      if (!category) category = 'Transfer Approval';
      statusBadge = { label: 'Approved', style: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      if (!explanation || explanation.includes('Verified recipient critical deficit')) {
        explanation = "The authorized reviewer checked the recipient's urgent blood requirement and the available blood at the sending location before approving the transfer.";
      }
      if (!additionalNote) {
        additionalNote = 'Approved by Authorized Reviewer for cold-chain transport.';
      }
      break;

    case 'TRANSFER_DISPATCHED':
      if (!title) title = 'Blood Transfer Dispatched for Transport';
      if (!category) category = 'Cold-Chain Transport';
      statusBadge = { label: 'Being Transported', style: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
      if (!explanation) explanation = 'Cold-chain transport has departed from the dispatch facility.';
      break;

    case 'TRANSFER_RECEIVED':
      if (!title) title = 'Blood Delivery Confirmed at Destination';
      if (!category) category = 'Delivery Confirmation';
      statusBadge = { label: 'Delivery Confirmed', style: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      if (!explanation) explanation = 'The receiving facility confirmed delivery and credited units to available stock.';
      break;

    case 'TRANSFER_REJECTED':
      if (!title) title = 'Blood Transfer Request Rejected';
      if (!category) category = 'Clinical Review Decision';
      statusBadge = { label: 'Request Rejected', style: 'bg-red-50 text-red-800 border-red-200' };
      if (!explanation) explanation = 'The request was reviewed and rejected with documented clinical justification.';
      break;

    case 'STOCK_ROTATION_PLANNED':
    case 'EXPIRY_RESCUE_INITIATED':
      if (!title) title = 'Stock Rotation Planned for Near-Expiry Blood';
      if (!category) category = 'Stock Rotation';
      statusBadge = { label: 'Stock Rotation Planned', style: 'bg-amber-50 text-amber-800 border-amber-200' };
      if (!explanation) explanation = 'Proactive blood transfer planned to a high-demand facility before expiration.';
      break;

    case 'TRANSFER_REQUEST_CREATED':
      if (!title) title = 'Blood Transfer Request Submitted';
      if (!category) category = 'Transfer Request';
      statusBadge = { label: 'Waiting for Approval', style: 'bg-amber-50 text-amber-800 border-amber-200' };
      if (!explanation) explanation = 'A healthcare facility submitted a transfer request awaiting clinical authorization.';
      break;

    default:
      if (!title) title = log.action.replace(/_/g, ' ');
      if (!category) category = log.entityType.replace(/_/g, ' ');
      statusBadge = { label: 'Recorded Action', style: 'bg-stone-50 text-stone-700 border-stone-200' };
      break;
  }

  explanation = sanitizeTechnicalText(explanation);
  if (additionalNote) {
    additionalNote = sanitizeTechnicalText(additionalNote);
  }

  const dateObj = new Date(log.timestamp);
  const dateStr = dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const diffMs = Date.now() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  let relativeTime = 'Just now';
  if (diffMins >= 1 && diffMins < 60) {
    relativeTime = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffMins >= 60 && diffMins < 1440) {
    const diffHours = Math.floor(diffMins / 60);
    relativeTime = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMins >= 1440) {
    const diffDays = Math.floor(diffMins / 1440);
    relativeTime = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  return {
    title,
    performer,
    performerType,
    category,
    explanation,
    additionalNote,
    statusBadge,
    isSimulated,
    dateStr,
    relativeTime,
  };
}

export function AuditLogsPage() {
  const { logs } = useAuditStore();
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedDetails(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const processedLogs = useMemo(() => {
    return logs.map(log => ({
      raw: log,
      display: resolveEventDisplay(log),
    }));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return processedLogs.filter(({ raw, display }) => {
      // Role / Performer Filter
      if (selectedRole === 'AUTOMATED' && display.performerType !== 'AUTOMATED') return false;
      if (selectedRole === 'HUMAN' && display.performerType !== 'HUMAN') return false;
      if (selectedRole !== 'ALL' && selectedRole !== 'AUTOMATED' && selectedRole !== 'HUMAN') {
        if (raw.userRole !== selectedRole) return false;
      }

      // Category Filter
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'ESTIMATE' && display.category !== 'Demand Estimate') return false;
        if (selectedCategory === 'WARNING' && display.category !== 'Stock Warning') return false;
        if (selectedCategory === 'RECOMMENDATION' && display.category !== 'Sharing Recommendation') return false;
        if (selectedCategory === 'APPROVAL' && display.category !== 'Transfer Approval') return false;
        if (selectedCategory === 'LOGISTICS' && display.category !== 'Cold-Chain Transport' && display.category !== 'Delivery Confirmation') return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchCorpus = [
          display.title,
          display.performer,
          display.category,
          display.explanation,
          display.additionalNote || '',
          raw.entityId,
          raw.id,
        ].join(' ').toLowerCase();

        if (!searchCorpus.includes(q)) return false;
      }

      return true;
    });
  }, [processedLogs, selectedRole, selectedCategory, searchQuery]);

  const totalEvents = logs.length;
  const humanEventsCount = processedLogs.filter(p => p.display.performerType === 'HUMAN').length;
  const automatedEventsCount = processedLogs.filter(p => p.display.performerType === 'AUTOMATED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#841A2B]">
              Accountability & Trust
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-stone-500 font-medium">Permanent Record</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Activity & Record History
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Chronological record of stock estimates, safety alerts, sharing proposals, and human transfer authorizations.
          </p>
        </div>

        {/* Quick Summary Cards */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 bg-white px-3.5 py-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center">
              <History className="w-4 h-4 text-stone-700" />
            </div>
            <div>
              <span className="text-[10px] text-stone-500 uppercase font-semibold block leading-none">Total Events</span>
              <p className="text-base font-bold font-mono text-stone-900 leading-tight mt-0.5">
                {totalEvents}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white px-3.5 py-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-stone-500 uppercase font-semibold block leading-none">Human Approvals</span>
              <p className="text-base font-bold font-mono text-emerald-800 leading-tight mt-0.5">
                {humanEventsCount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white px-3.5 py-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-stone-500 uppercase font-semibold block leading-none">Automated Records</span>
              <p className="text-base font-bold font-mono text-sky-800 leading-tight mt-0.5">
                {automatedEventsCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Demonstration Transparency Notice Banner */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-amber-950">
            Demonstration data disclosure
          </p>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            Events shown in this activity log are based on demonstration information to show how stock monitoring, recommendations, and clinical authorizations work. They do not represent live hospital blood supplies, and all physical blood transfers require human review and authorization.
          </p>
        </div>
      </div>

      {/* 3. Search and Role Filter */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by action, performer name, or explanation..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:border-[#841A2B] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-stone-500 font-medium">Type:</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-[#841A2B]"
            >
              <option value="ALL">All Categories</option>
              <option value="ESTIMATE">Demand Estimates</option>
              <option value="WARNING">Stock Warnings</option>
              <option value="RECOMMENDATION">Sharing Recommendations</option>
              <option value="APPROVAL">Transfer Approvals</option>
              <option value="LOGISTICS">Transport & Delivery</option>
            </select>
          </div>

          {/* Performer Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-[#841A2B]"
            >
              <option value="ALL">All Performers</option>
              <option value="AUTOMATED">Automated Systems Only</option>
              <option value="HUMAN">Human Reviewers Only</option>
              <option value="AUTHORIZED_APPROVER">Authorized Approver</option>
              <option value="HOSPITAL_STAFF">Hospital Staff</option>
              <option value="BLOOD_BANK_STAFF">Blood Bank Staff</option>
              <option value="LOGISTICS_STAFF">Logistics Staff</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Activity History Feed */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Recorded Clinical & Logistics Events
            </h3>
            <p className="text-[11px] text-stone-500">
              Plain-English activity timeline with full transparency on automated vs. human actions
            </p>
          </div>
          <span className="text-xs text-stone-500 font-medium bg-stone-100 px-2.5 py-1 rounded-md">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'event' : 'events'} matching
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500 space-y-2">
            <p className="font-semibold text-stone-700">No activity records match your search criteria.</p>
            <p className="text-stone-400">Try clearing the search box or changing your category or performer filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredLogs.map(({ raw: log, display }) => {
              const isExpanded = !!expandedDetails[log.id];

              return (
                <div
                  key={log.id}
                  className="p-5 hover:bg-stone-50/40 transition-colors space-y-3"
                >
                  {/* Top Meta Line: Badges and Timestamps */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Badge */}
                      <span className={cn('text-[11px] font-bold tracking-wide px-2.5 py-0.5 rounded-full border', display.statusBadge.style)}>
                        {display.statusBadge.label}
                      </span>

                      {/* Event Category */}
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                        {display.category}
                      </span>

                      {/* Demonstration Label */}
                      {display.isSimulated && (
                        <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Demonstration data
                        </span>
                      )}
                    </div>

                    {/* Date and Time */}
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{display.dateStr}</span>
                      <span className="text-stone-300">•</span>
                      <span className="text-stone-400">{display.relativeTime}</span>
                    </div>
                  </div>

                  {/* Main Event Title */}
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-stone-900 tracking-tight">
                      {display.title}
                    </h4>

                    {/* Performer: Simple, honest description */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
                      <span className="flex items-center gap-1.5">
                        {display.performerType === 'HUMAN' ? (
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-sky-600" />
                        )}
                        <span>
                          Performed by: <strong className="text-stone-900 font-semibold">{display.performer}</strong>
                        </span>
                      </span>

                      {display.performerType === 'AUTOMATED' ? (
                        <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          Automated System
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Authorized Human Reviewer
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Clear Explanation in normal English */}
                  <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/70 text-xs text-stone-800 leading-relaxed space-y-1.5">
                    <p className="font-normal">{display.explanation}</p>

                    {/* Additional Note / Clinical Guardrail */}
                    {display.additionalNote && (
                      <div className="flex items-start gap-1.5 pt-1 text-[11px] text-stone-600 border-t border-stone-200/50 mt-1.5">
                        <Info className="w-3.5 h-3.5 text-[#841A2B] shrink-0 mt-0.5" />
                        <span className="italic">{display.additionalNote}</span>
                      </div>
                    )}
                  </div>

                  {/* Expandable Section: Reference Details for Authorized Staff Only */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => toggleExpand(log.id)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-stone-500 hover:text-stone-800 transition-colors py-0.5 focus:outline-none"
                    >
                      <span>{isExpanded ? 'Hide reference details' : 'View additional details'}</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isExpanded && "rotate-180")} />
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 p-3.5 rounded-lg bg-stone-100/70 border border-stone-200 text-xs space-y-2.5 animate-in fade-in-50 duration-150">
                        <div className="flex items-center justify-between text-stone-500 font-semibold uppercase tracking-wider text-[10px] border-b border-stone-200 pb-1.5">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-stone-600" />
                            Reference Details
                          </span>
                          <span className="text-stone-400 font-normal normal-case">
                            Intended for authorized staff and technical support only
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
                          <div className="space-y-0.5">
                            <span className="text-stone-400 text-[10px] uppercase font-semibold block">Event Reference</span>
                            <span className="font-mono font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200 inline-block">
                              {log.entityId}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-stone-400 text-[10px] uppercase font-semibold block">Record ID</span>
                            <span className="font-mono text-stone-700 bg-white px-2 py-0.5 rounded border border-stone-200 inline-block">
                              {log.id}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-stone-400 text-[10px] uppercase font-semibold block">System / User ID</span>
                            <span className="font-mono text-stone-700 bg-white px-2 py-0.5 rounded border border-stone-200 inline-block">
                              {log.userId}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-stone-400 text-[10px] uppercase font-semibold block">Internal Action</span>
                            <span className="font-mono text-stone-700 bg-white px-2 py-0.5 rounded border border-stone-200 inline-block">
                              {log.action}
                            </span>
                          </div>

                          {log.oldValue && (
                            <div className="space-y-0.5 sm:col-span-2">
                              <span className="text-stone-400 text-[10px] uppercase font-semibold block">Previous Value</span>
                              <span className="text-stone-700 font-mono text-[11px] block bg-white p-1.5 rounded border border-stone-200 break-all">
                                {log.oldValue}
                              </span>
                            </div>
                          )}

                          {log.newValue && (
                            <div className="space-y-0.5 sm:col-span-2">
                              <span className="text-stone-400 text-[10px] uppercase font-semibold block">Recorded Value</span>
                              <span className="text-stone-700 font-mono text-[11px] block bg-white p-1.5 rounded border border-stone-200 break-all">
                                {log.newValue}
                              </span>
                            </div>
                          )}

                          {log.recommendationId && (
                            <div className="space-y-0.5">
                              <span className="text-stone-400 text-[10px] uppercase font-semibold block">Transfer Reference</span>
                              <span className="font-mono text-stone-800 bg-white px-2 py-0.5 rounded border border-stone-200 inline-block">
                                {log.recommendationId}
                              </span>
                            </div>
                          )}

                          <div className="space-y-0.5">
                            <span className="text-stone-400 text-[10px] uppercase font-semibold block">ISO Timestamp</span>
                            <span className="font-mono text-stone-500 text-[10px] bg-white px-2 py-0.5 rounded border border-stone-200 inline-block">
                              {log.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
