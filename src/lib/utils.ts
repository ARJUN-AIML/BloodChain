// BloodChain AI — Utility Functions

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { BloodGroup, Severity, ComponentType, TransferStatus, RequestStatus, BloodUnitStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BLOOD_GROUP_LABELS: Record<BloodGroup, string> = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A−',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B−',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB−',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O−',
};

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  WHOLE_BLOOD: 'Whole Blood',
  RBC: 'Red Blood Cells',
  PLASMA: 'Plasma',
  PLATELETS: 'Platelets',
  CRYOPRECIPITATE: 'Cryoprecipitate',
};

export const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string; text: string; icon: string }> = {
  INFO: { color: 'text-blue-400', bg: 'bg-blue-500/10', text: 'Info', icon: '●' },
  WARNING: { color: 'text-amber-400', bg: 'bg-amber-500/10', text: 'Warning', icon: '▲' },
  HIGH: { color: 'text-orange-400', bg: 'bg-orange-500/10', text: 'High', icon: '◆' },
  CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/20', text: 'Critical', icon: '⬤' },
};

export function formatBloodGroup(bg: string): string {
  return BLOOD_GROUP_LABELS[bg as BloodGroup] || bg;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

export function getStatusColor(status: TransferStatus | RequestStatus | BloodUnitStatus | string): string {
  const map: Record<string, string> = {
    AVAILABLE: 'text-emerald-400',
    RESERVED: 'text-blue-400',
    DISPATCHED: 'text-purple-400',
    IN_TRANSIT: 'text-purple-400',
    RECEIVED: 'text-emerald-400',
    DELIVERED: 'text-emerald-400',
    VERIFIED: 'text-emerald-500',
    COMPLETED: 'text-emerald-400',
    USED: 'text-gray-400',
    EXPIRED: 'text-red-400',
    QUARANTINED: 'text-amber-400',
    CANCELLED: 'text-gray-500',
    OPEN: 'text-blue-400',
    SEARCHING: 'text-amber-400',
    ALLOCATED: 'text-emerald-400',
    PREPARING: 'text-amber-400',
    READY_FOR_PICKUP: 'text-blue-400',
    REJECTED: 'text-red-400',
    COLLECTED: 'text-blue-300',
    TESTING: 'text-amber-300',
    PROCESSING: 'text-purple-300',
    PENDING: 'text-gray-400',
    PASSED: 'text-emerald-400',
    FAILED: 'text-red-400',
  };
  return map[status] || 'text-gray-400';
}

export function getCoverageColor(ratio: number): string {
  if (ratio >= 1.5) return 'text-emerald-400';
  if (ratio >= 1.0) return 'text-cyan-400';
  if (ratio >= 0.7) return 'text-amber-400';
  if (ratio >= 0.4) return 'text-orange-400';
  return 'text-red-400';
}
