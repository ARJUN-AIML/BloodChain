import React from 'react';
import { Lock, ShieldAlert, RefreshCw, KeyRound } from 'lucide-react';
import { useAuthStore, ROLE_DISPLAY_NAMES } from '@/lib/auth-store';
import type { UserRole } from '@/types';

interface RoleActionGateProps {
  requiredRole: UserRole | UserRole[];
  actionLabel: string;
  children: React.ReactNode;
  fallbackMessage?: string;
  compact?: boolean;
}

export const RoleActionGate: React.FC<RoleActionGateProps> = ({
  requiredRole,
  actionLabel,
  children,
  fallbackMessage,
  compact = false,
}) => {
  const { currentUser, switchRole } = useAuthStore();

  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const isAuthorized = allowedRoles.includes(currentUser.role);

  if (isAuthorized) {
    return <>{children}</>;
  }

  const primaryRequired = allowedRoles[0];
  const primaryRoleName = ROLE_DISPLAY_NAMES[primaryRequired] || primaryRequired;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-medium">
        <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span>Requires <strong>{primaryRoleName}</strong></span>
        <button
          onClick={() => switchRole(primaryRequired)}
          className="ml-1 px-2 py-0.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
        >
          <RefreshCw className="w-2.5 h-2.5" /> Switch
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-950 space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">
              Role Authorization Notice — Separation of Duties
            </h4>
            <span className="font-mono text-[10px] text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded font-semibold">
              Current Role: {ROLE_DISPLAY_NAMES[currentUser.role]}
            </span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            {fallbackMessage || (
              <>
                The action <strong>"{actionLabel}"</strong> is restricted to <strong className="text-amber-950">{allowedRoles.map(r => ROLE_DISPLAY_NAMES[r]).join(' or ')}</strong> to maintain clinical audit compliance.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
        <span className="text-[11px] text-amber-800 font-mono">Click below to switch active operational context in 1 click:</span>
        <button
          onClick={() => switchRole(primaryRequired)}
          className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Switch to {primaryRoleName}
        </button>
      </div>
    </div>
  );
};
