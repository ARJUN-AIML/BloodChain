import { useState } from 'react';
import { Heart, Search } from 'lucide-react';
import { cn, formatBloodGroup } from '@/lib/utils';
import { DEMO_DONORS, DEMO_CAMPAIGNS } from '@/lib/demo-data';

export function DonorDashboard() {
  const [search, setSearch] = useState('');
  const [bloodFilter, setBloodFilter] = useState('ALL');

  const donors = DEMO_DONORS.filter(d => {
    const dName = d.name || d.fullName || '';
    const dPhone = d.phone || '';
    const matchesSearch = dName.toLowerCase().includes(search.toLowerCase()) || dPhone.includes(search);
    const matchesBlood = bloodFilter === 'ALL' || d.bloodGroup === bloodFilter;
    return matchesSearch && matchesBlood;
  });

  const activeCampaigns = DEMO_CAMPAIGNS.filter(c => c.status === 'ACTIVE');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E2DC]">
        <div>
          <h2 className="text-xl font-bold text-[#1A1F26] tracking-tight">Donor Intelligence & Engagement</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Registered donor directory, recurring eligibility tracking, and emergency drive campaigns
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat">
          <p className="text-2xl font-bold text-[#1A1F26] font-mono">{DEMO_DONORS.length}</p>
          <p className="text-xs text-[#64748B] mt-0.5">Registered Donors</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat">
          <p className="text-2xl font-bold text-[#5B8C7A] font-mono">
            {DEMO_DONORS.filter(d => d.eligibilityStatus === 'ELIGIBLE').length}
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">Eligible Now</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat">
          <p className="text-2xl font-bold text-[#5C768D] font-mono">36</p>
          <p className="text-xs text-[#64748B] mt-0.5">Lives Impacted</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat">
          <p className="text-2xl font-bold text-[#C85A3F] font-mono">{activeCampaigns.length}</p>
          <p className="text-xs text-[#64748B] mt-0.5">Active Drives</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Searchable Donor Registry Table (2 cols) */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E2E2DC] mb-3">
            <h3 className="text-sm font-bold text-[#1A1F26]">Donor Registry</h3>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E2E2DC] bg-[#F7F7F5] text-xs">
                <Search className="w-3.5 h-3.5 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Search donor..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent text-[#1A1F26] placeholder-[#64748B] focus:outline-none w-32"
                />
              </div>

              <select
                value={bloodFilter}
                onChange={e => setBloodFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#E2E2DC] bg-[#F7F7F5] text-xs text-[#1A1F26] focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="O_POSITIVE">O+</option>
                <option value="A_POSITIVE">A+</option>
                <option value="B_POSITIVE">B+</option>
                <option value="AB_POSITIVE">AB+</option>
                <option value="O_NEGATIVE">O-</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#64748B] border-b border-[#E2E2DC]">
                  <th className="pb-2 font-medium">Donor Name</th>
                  <th className="pb-2 font-medium">Blood Group</th>
                  <th className="pb-2 font-medium">Total Donations</th>
                  <th className="pb-2 font-medium">Last Donation</th>
                  <th className="pb-2 font-medium text-right">Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E2DC]">
                {donors.map(d => {
                  const isEligible = d.eligibilityStatus === 'ELIGIBLE';
                  return (
                    <tr key={d.id} className="hover:bg-[#F7F7F5] transition-colors">
                      <td className="py-2.5 font-semibold text-[#1A1F26]">
                        {d.name || d.fullName}
                        <span className="block text-[10px] font-normal text-[#64748B]">{d.phone || '+91 98765 43210'}</span>
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-[#F4F4F0] border border-[#E2E2DC] font-bold text-[#C85A3F]">
                          {formatBloodGroup(d.bloodGroup)}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-[#1A1F26]">{d.totalDonations} times</td>
                      <td className="py-2.5 text-[#64748B]">{d.lastDonationDate || 'First Time'}</td>
                      <td className="py-2.5 text-right">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                          isEligible
                            ? 'bg-[#E3EFEA] text-[#5B8C7A] border-[#5B8C7A]/20'
                            : 'bg-[#FAF0D6] text-[#D99B38] border-[#D99B38]/20'
                        )}>
                          {d.eligibilityStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Emergency Campaigns (1 col) */}
        <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-5 shadow-flat flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E2DC] mb-3">
              <h3 className="text-sm font-bold text-[#1A1F26]">Active Donation Drives</h3>
              <span className="text-xs text-[#64748B]">{activeCampaigns.length} active</span>
            </div>

            <div className="space-y-3">
              {activeCampaigns.map(c => {
                const targetBg = c.targetBloodGroup ? formatBloodGroup(c.targetBloodGroup) : 'O+';
                const pledged = c.unitsPledged || 20;
                const needed = c.unitsNeeded || 50;
                const percent = Math.min(100, Math.round((pledged / needed) * 100));

                return (
                  <div key={c.id} className="p-3 rounded-lg border border-[#E2E2DC] bg-[#F7F7F5] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="px-2 py-0.5 rounded bg-[#FAF0D6] text-[#D99B38] text-[9px] font-bold">
                        Target: {targetBg}
                      </span>
                      <span className="text-[10px] text-[#64748B]">Ends: {c.endDate}</span>
                    </div>
                    <p className="font-bold text-[#1A1F26] mt-1">{c.title || c.name}</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">{c.targetOrganizationName || c.location}</p>

                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-[#64748B] mb-1">
                        <span>Progress</span>
                        <span className="font-mono font-bold text-[#1A1F26]">{pledged} / {needed} units</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#E2E2DC] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#C85A3F]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button className="w-full mt-4 py-2 rounded-lg bg-[#C85A3F] text-[#FFFFFF] font-semibold text-xs hover:bg-[#B24930] transition-colors shadow-flat">
            + Schedule New Drive
          </button>
        </div>
      </div>
    </div>
  );
}
