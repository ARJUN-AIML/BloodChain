import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Shield, TrendingUp, Users, FileText,
  AlertTriangle, Clock, Info, Check, ArrowLeftRight,
  Search, Bell, ChevronDown, Menu, X, PlusCircle, ExternalLink,
  ShieldCheck, HelpCircle
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { useAuthStore, DEMO_USERS, UserRole, ROLE_DISPLAY_NAMES } from '@/lib/auth-store';

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { currentUser, switchRole } = useAuthStore();

  const inventoryRows = [
    { group: 'O+', units: 186, forecast: '160 – 220', status: 'Adequate', statusType: 'adequate' },
    { group: 'O-', units: 28, forecast: '70 – 95', status: 'At Risk', statusType: 'risk' },
    { group: 'A+', units: 142, forecast: '120 – 180', status: 'Adequate', statusType: 'adequate' },
    { group: 'A-', units: 34, forecast: '40 – 70', status: 'Watch', statusType: 'watch' },
    { group: 'B+', units: 98, forecast: '80 – 130', status: 'Adequate', statusType: 'adequate' },
    { group: 'B-', units: 22, forecast: '35 – 60', status: 'At Risk', statusType: 'risk' },
    { group: 'AB+', units: 48, forecast: '40 – 75', status: 'Adequate', statusType: 'adequate' },
    { group: 'AB-', units: 12, forecast: '20 – 35', status: 'Watch', statusType: 'watch' },
  ];

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-stone-900 font-sans selection:bg-[#841A2B] selection:text-white">
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#F9F9F8]/95 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Left: Brand Identity */}
          <Link to="/" className="flex items-center gap-3 py-1 flex-shrink-0">
            <BrandLogo size="md" />
          </Link>

          {/* Center: Clean Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-stone-600">
            <Link
              to="/"
              className="text-stone-900 font-semibold border-b-2 border-[#841A2B] pb-1.5 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/command-center"
              className="hover:text-stone-900 pb-1.5 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/facilities"
              className="hover:text-stone-900 pb-1.5 transition-colors"
            >
              Facilities
            </Link>
            <Link
              to="/requests"
              className="hover:text-stone-900 pb-1.5 transition-colors"
            >
              Transfers
            </Link>
            <Link
              to="/forecasting"
              className="hover:text-stone-900 pb-1.5 transition-colors"
            >
              Analytics
            </Link>
            <Link
              to="/emergency-simulation"
              className="hover:text-stone-900 pb-1.5 transition-colors"
            >
              Simulation
            </Link>
            <Link
              to="/audit-logs"
              className="hover:text-stone-900 pb-1.5 transition-colors"
            >
              Reports
            </Link>
          </nav>

          {/* Right: Controls & User Profile */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Input */}
            <div className="relative hidden md:block">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 xl:w-56 h-8 pl-8 pr-3 text-xs bg-stone-100/90 hover:bg-stone-100 focus:bg-white text-stone-800 placeholder-stone-400 rounded-lg border border-stone-200/90 focus:border-[#841A2B] focus:outline-none focus:ring-1 focus:ring-[#841A2B] transition-all"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Notification Bell with Red Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDisclaimerModal('alerts')}
                className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg transition-colors relative"
                title="Simulated Alerts"
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-[#841A2B] absolute top-1 right-1 ring-2 ring-[#F9F9F8]" />
              </button>
            </div>

            {/* User Avatar Circle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 text-xs font-medium text-stone-800 hover:text-stone-950 transition-colors p-1 rounded-lg border border-stone-200/80 bg-white/70"
                title="Switch demo evaluation role"
              >
                <div className="w-7 h-7 rounded-full bg-[#841A2B] text-white flex items-center justify-center font-bold text-[11px] tracking-wider">
                  {(currentUser.name || 'User').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight pr-1">
                  <span className="font-bold text-stone-900 truncate max-w-[110px]">{currentUser.name}</span>
                  <span className="text-[10px] text-[#841A2B] font-medium">{ROLE_DISPLAY_NAMES[currentUser.role]}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              </button>

              {/* Demo Role Switcher Dropdown */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-stone-200 p-2 z-50 text-xs">
                  <div className="p-2.5 border-b border-stone-100 mb-1 bg-stone-50 rounded-lg">
                    <p className="font-bold text-stone-900">Demo Role Selection</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">Client-side prototype evaluation mode.</p>
                    <div className="mt-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Demo role — not production authentication
                    </div>
                  </div>
                  <div className="space-y-1">
                    {DEMO_USERS.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          switchRole(u.role as UserRole);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex flex-col transition-colors ${
                          currentUser.role === u.role ? 'bg-[#FDF2F4] text-[#841A2B] font-semibold border border-[#841A2B]/20' : 'hover:bg-stone-50 text-stone-700'
                        }`}
                      >
                        <span className="font-semibold text-stone-900">{u.name}</span>
                        <span className="text-[10px] text-[#841A2B] font-medium">{ROLE_DISPLAY_NAMES[u.role as UserRole]}</span>
                        <span className="text-[10px] text-stone-400 truncate">{u.organizationName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-stone-700 hover:text-stone-900 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden px-4 pt-2 pb-4 bg-white border-b border-stone-200 space-y-2 text-xs font-medium">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-[#841A2B] font-bold">Home</Link>
            <Link to="/command-center" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-stone-700">Dashboard</Link>
            <Link to="/facilities" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-stone-700">Facilities Map</Link>
            <Link to="/requests" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-stone-700">Transfers & Approvals</Link>
            <Link to="/forecasting" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-stone-700">Demand Analytics</Link>
            <Link to="/emergency-simulation" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-stone-700">Emergency Simulation</Link>
            <Link to="/audit-logs" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-stone-700">Reports & Audit</Link>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-12">
        {/* 2. Hero Section (Split Layout) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
          {/* Left Column: Headline & Value Proposition */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">
            <div className="space-y-3">
              <span className="inline-block text-[11px] font-bold uppercase tracking-[0.18em] text-[#841A2B]">
                Regional Blood Logistics Platform
              </span>

              <h1 className="text-4xl sm:text-5xl xl:text-[54px] font-serif font-bold text-stone-900 tracking-tight leading-[1.14]">
                Stronger Hospitals.<br />
                <span className="text-[#841A2B]">A Safer</span> Tomorrow.
              </h1>
            </div>

            <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-xl font-normal">
              BloodChain helps healthcare facilities in Tiruchirappalli and nearby districts predict demand, reduce shortages, prevent wastage, and coordinate blood transfers — with human oversight at every step.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/command-center"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#841A2B] hover:bg-[#701524] text-white text-xs sm:text-sm font-medium transition shadow-xs"
              >
                Open Command Center
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                to="/facilities"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 text-xs sm:text-sm font-medium transition shadow-2xs"
              >
                View Regional Network
              </Link>
            </div>

            {/* Subtext Footnote */}
            <div className="pt-2 flex items-center gap-2 text-stone-500 text-xs">
              <PlusCircle className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
              <span>Synthetic demonstration data — not live blood availability.</span>
            </div>
          </div>

          {/* Right Column: Rockfort Tiruchirappalli Visual */}
          <div className="lg:col-span-6 xl:col-span-5 relative">
            {/* Editorial Header above image */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-stone-800">
                  — Tiruchirappalli —
                </p>
                <p className="text-[10px] font-serif italic text-stone-500">
                  People · Care · Continuity
                </p>
              </div>

              {/* Stacked Motto Separator */}
              <div className="border-l border-stone-300 pl-3 text-right">
                <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.16em] font-bold text-stone-700 leading-tight">
                  DONATE<br />
                  COORDINATE<br />
                  SAVE LIVES
                </p>
              </div>
            </div>

            {/* Image Container with Soft Gradient Fade */}
            <div className="relative rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/80 shadow-2xs">
              {/* Soft Left Blend Gradient */}
              <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#F9F9F8] to-transparent z-10 pointer-events-none hidden lg:block" />

              <img
                src="/trichy-rockfort.jpg"
                alt="Rockfort, Tiruchirappalli"
                className="w-full h-64 sm:h-72 lg:h-80 object-cover object-center filter grayscale contrast-110"
              />

              {/* Bottom Right Caption */}
              <div className="absolute bottom-2 right-3 z-20">
                <span className="text-[11px] font-medium text-stone-700/90 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded shadow-2xs">
                  Rockfort, Tiruchirappalli
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Core Feature Cards (Horizontal Row of 4) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Demand Forecasting */}
          <Link
            to="/forecasting"
            className="group p-5 bg-white rounded-xl border border-stone-200/90 hover:border-stone-300 transition-all duration-200 flex flex-col justify-between shadow-2xs hover:shadow-xs"
          >
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#FDF2F4] text-[#841A2B] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-900 group-hover:text-[#841A2B] transition-colors">
                  Demand Forecasting
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Estimate blood-component demand with uncertainty to plan better.
                </p>
              </div>
            </div>
            <div className="pt-4">
              <span className="text-[#841A2B] text-sm font-bold group-hover:translate-x-1 inline-block transition-transform">
                →
              </span>
            </div>
          </Link>

          {/* Card 2: Shortage & Expiry Risk */}
          <Link
            to="/expiry-rescue"
            className="group p-5 bg-white rounded-xl border border-stone-200/90 hover:border-stone-300 transition-all duration-200 flex flex-col justify-between shadow-2xs hover:shadow-xs"
          >
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#FDF2F4] text-[#841A2B] flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-900 group-hover:text-[#841A2B] transition-colors">
                  Shortage & Expiry Risk
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Identify potential shortages and batches nearing expiry.
                </p>
              </div>
            </div>
            <div className="pt-4">
              <span className="text-[#841A2B] text-sm font-bold group-hover:translate-x-1 inline-block transition-transform">
                →
              </span>
            </div>
          </Link>

          {/* Card 3: Regional Coordination */}
          <Link
            to="/command-center"
            className="group p-5 bg-white rounded-xl border border-stone-200/90 hover:border-stone-300 transition-all duration-200 flex flex-col justify-between shadow-2xs hover:shadow-xs"
          >
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#FDF2F4] text-[#841A2B] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-900 group-hover:text-[#841A2B] transition-colors">
                  Regional Coordination
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Find safe-to-share inventory across nearby facilities with human approval.
                </p>
              </div>
            </div>
            <div className="pt-4">
              <span className="text-[#841A2B] text-sm font-bold group-hover:translate-x-1 inline-block transition-transform">
                →
              </span>
            </div>
          </Link>

          {/* Card 4: Emergency Simulation */}
          <Link
            to="/emergency-simulation"
            className="group p-5 bg-white rounded-xl border border-stone-200/90 hover:border-stone-300 transition-all duration-200 flex flex-col justify-between shadow-2xs hover:shadow-xs"
          >
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#FDF2F4] text-[#841A2B] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-900 group-hover:text-[#841A2B] transition-colors">
                  Emergency Simulation
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Test real-world scenarios and measure network resilience.
                </p>
              </div>
            </div>
            <div className="pt-4">
              <span className="text-[#841A2B] text-sm font-bold group-hover:translate-x-1 inline-block transition-transform">
                →
              </span>
            </div>
          </Link>
        </section>

        {/* 4. Lower Dashboard Preview (3 Columns) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Section A: Regional Network (Column 1 - 4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-stone-200/90 p-5 flex flex-col justify-between h-full shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Regional Network
              </h3>
              <Link to="/facilities" className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Stylized Minimal Geographic Map */}
            <div className="relative my-4 h-64 bg-stone-50/70 rounded-lg border border-stone-200/60 overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 340 300" className="w-full h-full select-none">
                {/* Background road network lines */}
                <path d="M70 65 L170 120 L275 140" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
                <path d="M230 75 L170 120 L160 175" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
                <path d="M160 175 L85 265" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
                <path d="M160 175 L115 220" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
                <path d="M160 175 L225 245" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />

                {/* Simulated Nodes */}
                {/* Musiri */}
                <circle cx="70" cy="65" r="3.5" fill="#78716C" />
                <text x="76" y="62" fontSize="9" fontWeight="600" fill="#44403C" fontFamily="sans-serif">Musiri</text>

                {/* Thuraiyur */}
                <circle cx="230" cy="75" r="3.5" fill="#78716C" />
                <text x="236" y="72" fontSize="9" fontWeight="600" fill="#44403C" fontFamily="sans-serif">Thuraiyur</text>

                {/* Srirangam */}
                <circle cx="170" cy="120" r="3.5" fill="#78716C" />
                <text x="178" y="117" fontSize="9" fontWeight="600" fill="#44403C" fontFamily="sans-serif">Srirangam</text>

                {/* Lalgudi */}
                <circle cx="275" cy="140" r="3.5" fill="#78716C" />
                <text x="281" y="138" fontSize="9" fontWeight="600" fill="#44403C" fontFamily="sans-serif">Lalgudi</text>

                {/* Tiruchirappalli (Core Central Hub) */}
                <circle cx="160" cy="175" r="7" fill="#841A2B" />
                <circle cx="160" cy="175" r="10" stroke="#841A2B" strokeWidth="1" strokeOpacity="0.4" fill="none" />
                <text x="175" y="179" fontSize="10" fontWeight="bold" fill="#1C1917" fontFamily="sans-serif">Tiruchirappalli</text>

                {/* Thuvakudi */}
                <circle cx="115" cy="220" r="3.5" fill="#78716C" />
                <text x="122" y="222" fontSize="9" fontWeight="600" fill="#44403C" fontFamily="sans-serif">Thuvakudi</text>

                {/* Manachanallur */}
                <circle cx="225" cy="245" r="3.5" fill="#78716C" />
                <text x="232" y="247" fontSize="9" fontWeight="600" fill="#44403C" fontFamily="sans-serif">Manachanallur</text>

                {/* Manapparai */}
                <circle cx="85" cy="265" r="3.5" fill="#78716C" />
                <text x="92" y="267" fontSize="9" fontWeight="600" fill="#44403C" fontFamily="sans-serif">Manapparai</text>
              </svg>
            </div>

            {/* Map Legend */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-stone-500 border-t border-stone-100">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#841A2B]" />
                Core Facility
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
                Partner Facility (Simulated)
              </span>
            </div>
          </div>

          {/* Section B: Current Inventory (Simulated) (Column 2 - 4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-stone-200/90 p-5 flex flex-col justify-between h-full shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Current Inventory <span className="text-stone-400 font-normal lowercase">(simulated)</span>
              </h3>
              <Link to="/inventory" className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 transition-colors">
                View details <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Inventory Table */}
            <div className="my-2 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-stone-400 text-[10px] uppercase font-semibold border-b border-stone-100">
                    <th className="py-2 font-medium">Blood Group</th>
                    <th className="py-2 text-center font-medium">Usable Units</th>
                    <th className="py-2 text-center font-medium">7-Day Forecast</th>
                    <th className="py-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {inventoryRows.map((row) => (
                    <tr key={row.group} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-2 font-semibold text-stone-900">{row.group}</td>
                      <td className="py-2 text-center font-mono text-stone-700">{row.units}</td>
                      <td className="py-2 text-center font-mono text-stone-500 text-[11px]">{row.forecast}</td>
                      <td className="py-2 text-right">
                        <span
                          className={`font-medium ${
                            row.statusType === 'risk'
                              ? 'text-[#841A2B] font-semibold'
                              : row.statusType === 'watch'
                              ? 'text-stone-600'
                              : 'text-stone-700'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-stone-400 pt-2 border-t border-stone-100">
              Simulated inventory levels for regional demonstration.
            </p>
          </div>

          {/* Section C: Active Alerts & Recent Activity (Column 3 - 4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Card C1: Active Alerts */}
            <div className="bg-white rounded-xl border border-stone-200/90 p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Active Alerts
                </h3>
                <Link to="/emergency-simulation" className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 transition-colors">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {/* Alert 1 */}
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-[#841A2B] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-900">O- shortage risk</p>
                    <p className="text-[11px] text-stone-500 truncate">Tiruchirappalli GH (Simulated)</p>
                  </div>
                  <span className="text-[10px] text-stone-400 whitespace-nowrap">2 hours ago</span>
                </div>

                {/* Alert 2 */}
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#841A2B] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-900">A- batches expiring soon</p>
                    <p className="text-[11px] text-stone-500 truncate">Srirangam (Simulated)</p>
                  </div>
                  <span className="text-[10px] text-stone-400 whitespace-nowrap">5 hours ago</span>
                </div>

                {/* Alert 3 */}
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-stone-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-900">Transfer request pending</p>
                    <p className="text-[11px] text-stone-500 truncate">Thuvakudi → Tiruchirappalli</p>
                  </div>
                  <span className="text-[10px] text-stone-400 whitespace-nowrap">1 day ago</span>
                </div>
              </div>
            </div>

            {/* Card C2: Recent Activity */}
            <div className="bg-white rounded-xl border border-stone-200/90 p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Recent Activity
                </h3>
                <Link to="/audit-logs" className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 transition-colors">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {/* Activity 1 */}
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-stone-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-900">Forecast updated</p>
                    <p className="text-[11px] text-stone-500 truncate">Tiruchirappalli</p>
                  </div>
                  <span className="text-[10px] text-stone-400 whitespace-nowrap">30 mins ago</span>
                </div>

                {/* Activity 2 */}
                <div className="flex items-start gap-3">
                  <ArrowLeftRight className="w-4 h-4 text-stone-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-900">Transfer request created</p>
                    <p className="text-[11px] text-stone-500 truncate">Lalgudi → Manachanallur</p>
                  </div>
                  <span className="text-[10px] text-stone-400 whitespace-nowrap">2 hours ago</span>
                </div>

                {/* Activity 3 */}
                <div className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-[#841A2B] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-900">Batch received</p>
                    <p className="text-[11px] text-stone-500 truncate">Manapparai</p>
                  </div>
                  <span className="text-[10px] text-stone-400 whitespace-nowrap">6 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 5. Minimalist Enterprise Footer */}
      <footer className="border-t border-stone-200/80 bg-[#F9F9F8] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            <span className="font-semibold text-stone-800">BloodChain</span>
            <span className="mx-2 text-stone-300">/</span>
            <span>Tiruchirappalli Regional Network</span>
            <span className="mx-2 text-stone-300">/</span>
            <span className="font-mono text-stone-600">Research Prototype</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setShowDisclaimerModal('about')}
              className="hover:text-stone-900 transition-colors"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => setShowDisclaimerModal('privacy')}
              className="hover:text-stone-900 transition-colors"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => setShowDisclaimerModal('disclaimer')}
              className="hover:text-stone-900 transition-colors"
            >
              Disclaimer
            </button>
            <button
              type="button"
              onClick={() => setShowDisclaimerModal('contact')}
              className="hover:text-stone-900 transition-colors"
            >
              Contact
            </button>
          </div>
        </div>
      </footer>

      {/* Research & Compliance Disclosure Modal */}
      {showDisclaimerModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h4 className="font-serif font-bold text-base text-stone-900 capitalize">
                {showDisclaimerModal} & Research Scope
              </h4>
              <button
                type="button"
                onClick={() => setShowDisclaimerModal(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-stone-600 space-y-3 leading-relaxed">
              <p>
                <strong>BloodChain AI</strong> is a healthcare logistics research prototype configured for the Tiruchirappalli (Trichy) district, Tamil Nadu.
              </p>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80 space-y-1 text-[11px]">
                <p><strong>• Synthetic Data Notice:</strong> All blood inventory values, patient emergency demands, and transfer records are simulated for academic demonstration and system evaluation.</p>
                <p><strong>• No Live Hospital Connection:</strong> Facilities are modeled as research nodes (Tiruchirappalli, Srirangam, Thuvakudi, Manapparai, Lalgudi, Manachanallur, Musiri, Thuraiyur).</p>
                <p><strong>• Human Clinical Invariant:</strong> The platform does not autonomously dispatch physical blood. All solver allocations require clinical authorization.</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDisclaimerModal(null)}
                className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
