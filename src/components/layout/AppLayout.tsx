import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, MapPin, Building2, Droplets, Truck,
  Heart, TrendingUp, Package, FileText, Brain, Bell, Search,
  ChevronLeft, ChevronRight, ShieldCheck, AlertTriangle,
  Zap, History, CheckCircle2, UserCheck, AlertCircle, ChevronDown, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_NOTIFICATIONS, SYNTHETIC_DATA_NOTICE } from '@/lib/demo-data';
import { useAuthStore, DEMO_USERS, UserRole, ROLE_DISPLAY_NAMES } from '@/lib/auth-store';
import { BrandLogo } from '@/components/common/BrandLogo';

interface NavItem {
  path: string;
  label: string;
  icon?: any;
}

export function AppLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { currentUser, switchRole } = useAuthStore();
  const unreadCount = DEMO_NOTIFICATIONS.filter(n => !n.isRead).length;

  const initials = (currentUser.name || 'User')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Dynamic Navigation definitions based on current role
  const getPrimaryNav = (role: UserRole): NavItem[] => {
    switch (role) {
      case 'ADMIN':
        return [
          { path: '/', label: 'Home' },
          { path: '/live-demo', label: '⚡ Live Demo' },
          { path: '/command-center', label: 'Overview' },
          { path: '/facilities', label: 'Facilities' },
          { path: '/inventory', label: 'Inventory' },
          { path: '/requests', label: 'Transfers' },
          { path: '/emergency-simulation', label: 'Simulation' },
          { path: '/audit-logs', label: 'Audit History' },
        ];
      case 'AUTHORIZED_APPROVER':
        return [
          { path: '/', label: 'Home' },
          { path: '/live-demo', label: '⚡ Live Demo' },
          { path: '/command-center', label: 'Approvals' },
          { path: '/requests', label: 'Transfer Requests' },
          { path: '/safe-to-share', label: 'Safe to Share' },
          { path: '/forecasting', label: 'Forecast Context' },
          { path: '/facilities', label: 'Facilities' },
        ];
      case 'HOSPITAL_STAFF':
        return [
          { path: '/', label: 'Home' },
          { path: '/live-demo', label: '⚡ Live Demo' },
          { path: '/command-center', label: 'Hospital Unit' },
          { path: '/requests', label: 'Request Blood' },
          { path: '/inventory', label: 'Local Stock' },
          { path: '/forecasting', label: 'Demand Forecast' },
          { path: '/facilities', label: 'Facilities' },
        ];
      case 'BLOOD_BANK_STAFF':
        return [
          { path: '/', label: 'Home' },
          { path: '/live-demo', label: '⚡ Live Demo' },
          { path: '/command-center', label: 'Blood Bank Hub' },
          { path: '/inventory', label: 'Batches & Stock' },
          { path: '/expiry-rescue', label: 'Stock Rotation' },
          { path: '/safe-to-share', label: 'Safe to Share' },
          { path: '/requests', label: 'Dispatches' },
        ];
      case 'LOGISTICS_STAFF':
        return [
          { path: '/', label: 'Home' },
          { path: '/live-demo', label: '⚡ Live Demo' },
          { path: '/command-center', label: 'Cold Transport' },
          { path: '/requests', label: 'Active Shipments' },
          { path: '/facilities', label: 'Facilities Map' },
        ];
      default:
        return [
          { path: '/', label: 'Home' },
          { path: '/live-demo', label: '⚡ Live Demo' },
          { path: '/command-center', label: 'Dashboard' },
          { path: '/facilities', label: 'Facilities' },
          { path: '/requests', label: 'Transfers' },
        ];
    }
  };

  const getSecondaryNav = (role: UserRole): NavItem[] => {
    switch (role) {
      case 'ADMIN':
        return [
          { path: '/live-demo', label: '⚡ Interactive Live Demo', icon: Zap },
          { path: '/command-center', label: 'System Overview', icon: LayoutDashboard },
          { path: '/facilities', label: 'Facility Management', icon: MapPin },
          { path: '/inventory', label: 'Network Blood Stock', icon: Package },
          { path: '/requests', label: 'Transfer Requests', icon: FileText },
          { path: '/emergency-simulation', label: 'Simulation Controls', icon: Zap },
          { path: '/ai-observability', label: 'System Monitoring', icon: Brain },
          { path: '/audit-logs', label: 'Activity & Record History', icon: History },
        ];
      case 'AUTHORIZED_APPROVER':
        return [
          { path: '/live-demo', label: '⚡ Interactive Live Demo', icon: Zap },
          { path: '/command-center', label: 'Approvals Overview', icon: LayoutDashboard },
          { path: '/requests', label: 'Pending Transfer Requests', icon: FileText },
          { path: '/safe-to-share', label: 'Blood Available for Sharing', icon: ShieldCheck },
          { path: '/forecasting', label: 'Blood Demand Forecast', icon: TrendingUp },
          { path: '/facilities', label: 'Facilities Map', icon: MapPin },
          { path: '/audit-logs', label: 'Approval Audit History', icon: History },
        ];
      case 'HOSPITAL_STAFF':
        return [
          { path: '/live-demo', label: '⚡ Interactive Live Demo', icon: Zap },
          { path: '/command-center', label: 'Hospital Unit Dashboard', icon: Building2 },
          { path: '/requests', label: 'Request Blood & Tracking', icon: FileText },
          { path: '/inventory', label: 'Local Blood Stock', icon: Package },
          { path: '/forecasting', label: 'Expected Blood Demand', icon: TrendingUp },
          { path: '/facilities', label: 'Regional Facilities', icon: MapPin },
        ];
      case 'BLOOD_BANK_STAFF':
        return [
          { path: '/live-demo', label: '⚡ Interactive Live Demo', icon: Zap },
          { path: '/command-center', label: 'Blood Bank Hub', icon: Droplets },
          { path: '/inventory', label: 'Batch-Level Inventory', icon: Package },
          { path: '/expiry-rescue', label: 'Expiring Blood & FEFO', icon: AlertTriangle },
          { path: '/safe-to-share', label: 'Safe to Share Surplus', icon: ShieldCheck },
          { path: '/requests', label: 'Transfer Dispatches', icon: FileText },
          { path: '/facilities', label: 'Facilities Directory', icon: MapPin },
        ];
      case 'LOGISTICS_STAFF':
        return [
          { path: '/live-demo', label: '⚡ Interactive Live Demo', icon: Zap },
          { path: '/command-center', label: 'Cold Transport Status', icon: Truck },
          { path: '/requests', label: 'Active Transfers & Courier', icon: FileText },
          { path: '/facilities', label: 'Route & Facility Map', icon: MapPin },
        ];
      default:
        return [
          { path: '/live-demo', label: '⚡ Interactive Live Demo', icon: Zap },
          { path: '/command-center', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/facilities', label: 'Facilities Map', icon: MapPin },
        ];
    }
  };

  const primaryNav = getPrimaryNav(currentUser.role);
  const secondaryNav = getSecondaryNav(currentUser.role);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F9F9F8] text-stone-900 font-sans">
      {/* 1. Primary Header Navigation Bar */}
      <header className="bg-[#F9F9F8] border-b border-stone-200/90 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Identity */}
          <Link to="/" className="flex items-center gap-3 py-1 flex-shrink-0" title="Return to Public Overview">
            <BrandLogo size="md" />
          </Link>

          {/* Center: Dynamic Navigation Links by Role */}
          <nav className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-stone-600">
            {primaryNav.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'pb-1.5 transition-colors',
                    isActive
                      ? 'text-stone-900 font-semibold border-b-2 border-[#841A2B]'
                      : 'hover:text-stone-900'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Search, Notifications & User */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Input */}
            <div className="relative hidden md:block">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 xl:w-48 h-8 pl-8 pr-3 text-xs bg-stone-100 hover:bg-stone-100 focus:bg-white text-stone-800 placeholder-stone-400 rounded-lg border border-stone-200 focus:border-[#841A2B] focus:outline-none focus:ring-1 focus:ring-[#841A2B] transition-all"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg transition-colors relative"
                aria-label="Toggle notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#841A2B] absolute top-1 right-1 ring-2 ring-[#F9F9F8]" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-11 w-80 max-h-96 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg z-50 p-2">
                  <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-stone-900">Simulated Notifications</h3>
                    <span className="text-[10px] text-stone-400">{unreadCount} unread</span>
                  </div>
                  <div className="divide-y divide-stone-100 text-xs">
                    {DEMO_NOTIFICATIONS.map(n => (
                      <div key={n.id} className="p-3 hover:bg-stone-50 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <span className={cn(
                            'mt-1 w-2 h-2 rounded-full flex-shrink-0',
                            n.severity === 'CRITICAL' ? 'bg-[#841A2B]' : 'bg-stone-400'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-stone-900">{n.title}</p>
                            <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{n.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic User Profile & Demo Role Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 text-xs font-medium text-stone-800 hover:text-stone-950 transition-colors p-1 rounded-lg border border-stone-200/80 bg-white/60 hover:bg-white shadow-2xs"
                title="Switch demo evaluation role"
              >
                <div className="w-7 h-7 rounded-full bg-[#841A2B] text-white flex items-center justify-center font-bold text-[11px] tracking-wider shadow-2xs">
                  {initials}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight pr-1">
                  <span className="font-bold text-stone-900 truncate max-w-[120px]">{currentUser.name}</span>
                  <span className="text-[10px] text-[#841A2B] font-medium">
                    {ROLE_DISPLAY_NAMES[currentUser.role]}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              </button>

              {/* Demo Role Switcher Dropdown */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-stone-200 p-2 z-50 text-xs">
                  <div className="p-2.5 border-b border-stone-100 mb-1 bg-stone-50 rounded-lg">
                    <p className="font-bold text-stone-900">Demo Role Selection</p>
                    <p className="text-[10px] text-stone-500 mt-0.5 leading-normal">
                      Client-side prototype evaluation mode.
                    </p>
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <ShieldAlert className="w-3 h-3 text-amber-700" /> Demo role — not production authentication
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
                        className={cn(
                          'w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors',
                          currentUser.role === u.role
                            ? 'bg-[#FDF2F4] text-[#841A2B] font-semibold border border-[#841A2B]/20'
                            : 'hover:bg-stone-50 text-stone-700'
                        )}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-semibold text-stone-900">{u.name}</p>
                          <p className="text-[10px] text-[#841A2B] font-medium">{ROLE_DISPLAY_NAMES[u.role as UserRole]}</p>
                          <p className="text-[10px] text-stone-400 truncate">{u.organizationName}</p>
                        </div>
                        {currentUser.role === u.role && <CheckCircle2 className="w-4 h-4 text-[#841A2B] flex-shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-400 px-2 leading-relaxed">
                    Selecting a role immediately updates navigation, available actions, and visible facility data without requiring page refresh.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. Mandatory Prototype Banner & Synthetic Data Strip */}
      <div className="bg-stone-100 text-stone-600 px-4 py-1 text-[11px] flex items-center justify-between border-b border-stone-200 select-none">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <span className="flex items-center gap-1 font-semibold text-stone-800">
              <AlertCircle className="w-3 h-3 text-[#841A2B]" />
              {SYNTHETIC_DATA_NOTICE}
            </span>
            <span className="text-stone-300 hidden sm:inline">•</span>
            <span className="text-stone-600 font-medium hidden sm:inline">
              Active Role: <strong className="text-stone-900">{ROLE_DISPLAY_NAMES[currentUser.role]}</strong> ({currentUser.name})
            </span>
            <span className="text-stone-300 hidden md:inline">•</span>
            <span className="text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 text-[10px] font-semibold hidden md:inline">
              Demo role — not production authentication
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-[10px] text-stone-500">
            <span>System Security Active</span>
          </div>
        </div>
      </div>

      {/* 3. Internal Application Layout with Secondary Navigation */}
      <div className="flex flex-1 overflow-hidden">
        {/* Secondary Collapsible Sidebar */}
        <aside
          className={cn(
            'flex flex-col border-r border-stone-200 bg-white transition-all duration-300 z-30',
            collapsed ? 'w-14' : 'w-56'
          )}
        >
          {/* Navigation Items */}
          <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
            {secondaryNav.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors',
                    isActive
                      ? 'bg-[#FDF2F4] text-[#841A2B] font-semibold border-l-2 border-[#841A2B]'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50 font-medium'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-[#841A2B]' : 'text-stone-400')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center py-2.5 border-t border-stone-100 text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors text-xs"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </aside>

        {/* Main View Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F9F9F8]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
