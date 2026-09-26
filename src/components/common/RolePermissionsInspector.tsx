import React from 'react';
import { X, ShieldCheck, UserCheck, Lock, Check, AlertCircle, RefreshCw, KeyRound, Building2 } from 'lucide-react';
import { useAuthStore, JURY_USERS, ROLE_DISPLAY_NAMES } from '@/lib/auth-store';
import type { UserRole } from '@/types';

interface RolePermissionsInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_PERMISSIONS: Record<UserRole, { title: string; desc: string; allowed: string[]; forbidden: string[]; org: string }> = {
  AUTHORIZED_APPROVER: {
    title: 'Authorized Clinical Approver',
    desc: 'Sole authorized role for approving or rejecting clinical blood transfers across the regional network.',
    org: 'Regional Blood Transfusion Council',
    allowed: [
      'Approve emergency & routine transfer requests',
      'Reject allocation recommendations with justification',
      'Override automated LP solver parameters',
      'Inspect regional safe-to-share inventory snapshot',
    ],
    forbidden: [
      'Cannot self-create transfer requests for own hospital',
      'Cannot directly dispatch courier fleet',
      'Cannot edit physical inventory counts',
    ]
  },
  HOSPITAL_STAFF: {
    title: 'Hospital Clinical Staff',
    desc: 'Emergency intake & hospital staff managing local patient demand and blood usage.',
    org: 'Manapparai Highway Trauma Unit',
    allowed: [
      'Create emergency & routine blood requests',
      'Record patient blood administration & usage',
      'Monitor incoming cold-chain transfer ETA',
      'View local hospital demand forecasts',
    ],
    forbidden: [
      'Cannot approve own blood transfer requests',
      'Cannot dispatch courier transport',
      'Cannot modify regional safety buffers',
    ]
  },
  BLOOD_BANK_STAFF: {
    title: 'Blood Bank Hub Staff',
    desc: 'Blood bank laboratory staff managing batch intake, component separation, and storage pools.',
    org: 'Tiruchirappalli Central Blood Bank Hub',
    allowed: [
      'Manage batch lifecycle & testing quarantine',
      'Initiate FEFO stock rotation for near-expiry units',
      'Confirm physical blood container pickup',
      'Manage donor collection campaigns',
    ],
    forbidden: [
      'Cannot approve clinical transfer requests',
      'Cannot start vehicle telemetry transport',
      'Cannot modify clinical override rules',
    ]
  },
  LOGISTICS_STAFF: {
    title: 'Cold-Chain Logistics Operator',
    desc: 'Fleet driver & logistics team responsible for temperature-monitored blood transport.',
    org: 'Kaveri Cold-Chain Fleet Depot',
    allowed: [
      'Initiate vehicle cold-chain transport',
      'Confirm courier pickup and arrival delivery',
      'Log IoT sensor temperature readings',
      'Generate driver transport manifests',
    ],
    forbidden: [
      'Cannot create blood requests',
      'Cannot approve transfer allocations',
      'Cannot modify hospital inventory balances',
    ]
  },
  ADMIN: {
    title: 'System & Security Administrator',
    desc: 'Master system operational lead overseeing system security, AI models, and audit compliance.',
    org: 'Regional System Operations',
    allowed: [
      'Run emergency disaster simulation scenarios',
      'Tune XGBoost AI forecasting model parameters',
      'Inspect cryptographic immutable audit logs',
      'Manage facility node configuration',
    ],
    forbidden: [
      'Cannot bypass clinical transfer approval requirements',
      'Cannot directly edit live patient transfusion logs',
    ]
  }
};

export const RolePermissionsInspector: React.FC<RolePermissionsInspectorProps> = ({ isOpen, onClose }) => {
  const { currentUser, switchRole } = useAuthStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-stone-200 flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="bg-[#841A2B] px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10 border border-white/20">
              <ShieldCheck className="w-5 h-5 text-red-200" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg leading-tight">Role Capability & Separation of Duties Matrix</h2>
              <p className="text-xs text-red-100 font-mono">Tiruchirappalli Clinical Governance • Multi-Role Policy Inspector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-stone-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active User Banner */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#841A2B] text-white font-bold flex items-center justify-center text-sm shadow-xs border border-white/20">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm leading-tight text-white">{currentUser.name}</p>
                <span className="text-[10px] font-mono font-bold bg-amber-400 text-stone-950 px-2 py-0.5 rounded">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono">{ROLE_DISPLAY_NAMES[currentUser.role]} • {currentUser.organizationName}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Role List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-[#841A2B] text-xs flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="font-bold">Strict Separation of Duties:</strong> In compliance with regional health governance, no single role possesses complete administrative & clinical control. Click <strong>"Switch Role"</strong> on any card below to instantly assume that operational context.
            </p>
          </div>

          <div className="space-y-4">
            {(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map(roleKey => {
              const perm = ROLE_PERMISSIONS[roleKey];
              const isActive = currentUser.role === roleKey;
              const matchedUser = JURY_USERS.find(u => u.role === roleKey);

              return (
                <div
                  key={roleKey}
                  className={`p-4 rounded-xl border transition ${
                    isActive
                      ? 'bg-red-50/40 border-[#841A2B] shadow-sm ring-1 ring-[#841A2B]/20'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-stone-900">{perm.title}</h3>
                        <span className="font-mono text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                          {roleKey}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">{perm.desc}</p>
                    </div>

                    {isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#841A2B] bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg shrink-0">
                        <UserCheck className="w-3.5 h-3.5" /> Active Context
                      </span>
                    ) : (
                      <button
                        onClick={async () => {
                          await switchRole(roleKey);
                        }}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-[#841A2B] text-white text-xs font-bold rounded-lg transition shrink-0 flex items-center gap-1 shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Switch Role
                      </button>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Permitted Actions
                      </p>
                      <ul className="space-y-1 text-[11px] text-stone-700">
                        {perm.allowed.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="font-bold text-rose-800 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-rose-600" /> Prohibited Actions
                      </p>
                      <ul className="space-y-1 text-[11px] text-stone-700">
                        {perm.forbidden.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-rose-600 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {matchedUser && (
                    <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                      <span>Default Demo Account: <strong>{matchedUser.name}</strong></span>
                      <span className="text-stone-400">{matchedUser.organizationName}</span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-stone-500 font-mono">BloodChain Security Module • ISO 27001 Compliant</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 transition"
          >
            Close Policy Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
