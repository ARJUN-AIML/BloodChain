import { useState } from 'react';
import {
  History, Shield, Filter, Search, UserCheck, CheckCircle2,
  Lock, FileText, ArrowRight, Clock,
} from 'lucide-react';
import { useAuditStore } from '@/lib/audit-store';
import type { UserRole } from '@/types';

export function AuditLogsPage() {
  const { logs } = useAuditStore();
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = logs.filter(log => {
    if (selectedRole !== 'ALL' && log.userRole !== selectedRole) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchText = `${log.userName} ${log.action} ${log.entityId} ${log.reason || ''}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#1A1F26] to-[#2C3E50] text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-[#5C768D]" />
            <h2 className="text-xl font-bold tracking-tight">Audit Trail & Governance Log</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E3EFEA] text-[#2C6E49] border border-[#C5E1D4] uppercase tracking-wider">
              Append-Only Immutability
            </span>
          </div>
          <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
            Maintains an immutable record of all model forecasts, shortage risk triggers, optimization recommendations, human approvals, and inventory reconciliations.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 p-3.5 rounded-xl border border-white/10 backdrop-blur-sm">
          <div className="text-right">
            <p className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Total Recorded Events</p>
            <p className="text-2xl font-bold text-white">{logs.length} Events</p>
          </div>
        </div>
      </div>

      {/* Controls & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#E2E2DC]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by user, action, or entity..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E2E2DC] bg-[#FAF9F6] text-[#1A1F26] placeholder-[#64748B]"
            />
          </div>

          <div>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E2DC] bg-[#FAF9F6] font-medium text-[#1A1F26]"
            >
              <option value="ALL">All User Roles</option>
              <option value="AUTHORIZED_APPROVER">Authorized Approver</option>
              <option value="ADMIN">System Admin</option>
              <option value="HOSPITAL_STAFF">Hospital Staff</option>
              <option value="BLOOD_BANK_STAFF">Blood Bank Staff</option>
              <option value="LOGISTICS_STAFF">Logistics Staff</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-[#E2E2DC] bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[#E2E2DC] bg-[#FAF9F6] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#1A1F26] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#2C6E49]" />
            Audit Ledger Entries
          </h3>
          <span className="text-[10px] font-mono text-[#64748B]">Local Append-Only Store</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F4F4F0] border-b border-[#E2E2DC] text-[10px] font-bold uppercase text-[#64748B]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User / Actor</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Entity ID</th>
                <th className="py-3 px-4">Old Value</th>
                <th className="py-3 px-4">New Value</th>
                <th className="py-3 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E2DC]">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-[#FAF9F6] transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-[#64748B]">
                    {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-[#1A1F26]">
                    {log.userName}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-[#FAF9F6] border border-[#E2E2DC] text-[#1A1F26]">
                      {log.userRole}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3EFEA] text-[#2C6E49]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-[#64748B]">
                    {log.entityId}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#64748B] max-w-xs truncate">
                    {log.oldValue || '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] font-bold text-[#1A1F26] max-w-xs truncate">
                    {log.newValue || '—'}
                  </td>
                  <td className="py-3 px-4 text-[11px] text-[#64748B] leading-relaxed max-w-sm">
                    {log.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
