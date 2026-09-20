import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, MapPin, Building2, Droplets, Truck,
  Heart, TrendingUp, Package, FileText, Brain, Bell, Search,
  ChevronLeft, ChevronRight, ShieldCheck, Shield, AlertTriangle,
  Zap, History, CheckCircle2, UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_NOTIFICATIONS } from '@/lib/demo-data';
import { useAuthStore, DEMO_USERS } from '@/lib/auth-store';
import type { UserRole } from '@/types';

const NAV_ITEMS = [
  { path: '/command-center', label: 'Command Center', icon: LayoutDashboard },
  { path: '/facilities', label: 'Facilities Map', icon: MapPin },
  { path: '/hospital', label: 'Hospital Node', icon: Building2 },
  { path: '/blood-bank', label: 'Blood Bank Hub', icon: Droplets },
  { path: '/logistics', label: 'Cold Logistics', icon: Truck },
  { path: '/donors', label: 'Donor Registry', icon: Heart },
  { path: '/forecasting', label: 'AI Forecasting (P10/P50/P90)', icon: TrendingUp },
  { path: '/inventory', label: 'Inventory Matrix', icon: Package },
  { path: '/safe-to-share', label: 'Safe-to-Share Engine', icon: ShieldCheck },
  { path: '/expiry-rescue', label: 'Expiry Rescue (FEFO)', icon: AlertTriangle },
  { path: '/requests', label: 'Allocation & Approvals', icon: FileText },
  { path: '/emergency-simulation', label: 'Emergency Digital Twin', icon: Zap },
  { path: '/audit-logs', label: 'Audit Trail', icon: History },
  { path: '/ai-observability', label: 'Model Observability', icon: Brain },
];

export function AppLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  
  const { currentUser, switchRole } = useAuthStore();
  const unreadCount = DEMO_NOTIFICATIONS.filter(n => !n.isRead).length;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F7F5] text-[#1A1F26]">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-[#E2E2DC] bg-[#FFFFFF] transition-all duration-300 z-30',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#E2E2DC]">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#FAF9F6] border border-[#E2E2DC] p-0.5 shadow-flat flex-shrink-0">
            <img src="/logo.png" alt="BloodChain AI Crest" className="w-full h-full object-contain rounded-md" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-[#1A1F26] font-sans">
                BloodChain <span className="text-[#C85A3F] font-semibold">AI</span>
              </span>
              <span className="text-[10px] text-[#64748B] font-medium tracking-wider uppercase">
                Decision Support Platform
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-[#FDF6F0] text-[#C85A3F] border-l-4 border-[#C85A3F] shadow-flat'
                    : 'text-[#64748B] hover:text-[#1A1F26] hover:bg-[#F4F4F0]'
                )}
              >
                <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-[#C85A3F]' : 'text-[#64748B]')} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center py-3 border-t border-[#E2E2DC] text-[#64748B] hover:text-[#1A1F26] hover:bg-[#F4F4F0] transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Action Bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-[#E2E2DC] bg-[#FFFFFF]">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-[#1A1F26]">
              {NAV_ITEMS.find(i => i.path === location.pathname)?.label || 'BloodChain AI'}
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#E3EFEA] text-[#2C6E49] border border-[#C5E1D4]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2C6E49]" />
              Local Demo Mode
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search trigger */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2E2DC] bg-[#F7F7F5] text-xs text-[#64748B] cursor-pointer hover:border-[#D4D4CE] transition-colors w-44">
              <Search className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Search network...</span>
              <kbd className="ml-auto text-[9px] font-mono px-1 py-0.5 bg-[#FFFFFF] border border-[#E2E2DC] rounded text-[#64748B]">⌘K</kbd>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-[#64748B] hover:text-[#1A1F26] hover:bg-[#F4F4F0] transition-colors border border-transparent hover:border-[#E2E2DC]"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#C85A3F] text-[8px] text-[#FFFFFF] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-11 w-80 max-h-96 overflow-y-auto rounded-xl border border-[#E2E2DC] bg-[#FFFFFF] shadow-soft z-50">
                  <div className="px-4 py-3 border-b border-[#E2E2DC] flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#1A1F26]">Notifications</h3>
                    <span className="text-[10px] text-[#64748B]">{unreadCount} unread</span>
                  </div>
                  <div className="divide-y divide-[#E2E2DC]">
                    {DEMO_NOTIFICATIONS.map(n => (
                      <div
                        key={n.id}
                        className={cn(
                          'px-4 py-3 hover:bg-[#F7F7F5] transition-colors cursor-pointer',
                          !n.isRead && 'bg-[#FDF6F0]/60'
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={cn(
                            'mt-1 w-2 h-2 rounded-full flex-shrink-0',
                            n.severity === 'CRITICAL' ? 'bg-[#C85A3F]' :
                            n.severity === 'HIGH' ? 'bg-[#D99B38]' :
                            n.severity === 'WARNING' ? 'bg-[#D99B38]' : 'bg-[#5C768D]'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#1A1F26]">{n.title}</p>
                            <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-[9px] text-[#64748B]/70 mt-1">
                              {new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Role Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg border border-[#E2E2DC] bg-[#FAF9F6] hover:bg-[#F4F4F0] transition-colors"
                title="Click to switch role / user permission"
              >
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono',
                  currentUser.role === 'AUTHORIZED_APPROVER' ? 'bg-[#C85A3F] text-white' :
                  currentUser.role === 'ADMIN' ? 'bg-[#2C6E49] text-white' : 'bg-[#5C768D] text-white'
                )}>
                  {currentUser.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-[#1A1F26] leading-tight">{currentUser.name}</span>
                  <span className="text-[9px] font-mono text-[#C85A3F] uppercase tracking-wider font-semibold">
                    {currentUser.role.replace('_', ' ')}
                  </span>
                </div>
                <UserCheck className="w-3.5 h-3.5 text-[#64748B] ml-1" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 top-11 w-72 rounded-xl border border-[#E2E2DC] bg-[#FFFFFF] shadow-soft z-50 p-2 space-y-1">
                  <div className="px-3 py-2 border-b border-[#E2E2DC]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Switch Local Demo User Role</p>
                    <p className="text-[11px] text-[#1A1F26] font-medium mt-0.5">Authorization permissions dictate transfer approval rights.</p>
                  </div>
                  {DEMO_USERS.map(user => (
                    <button
                      key={user.id}
                      onClick={() => {
                        switchRole(user.role);
                        setShowRoleMenu(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors',
                        currentUser.role === user.role
                          ? 'bg-[#FDF6F0] font-bold text-[#C85A3F]'
                          : 'hover:bg-[#F7F7F5] text-[#1A1F26]'
                      )}
                    >
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-[10px] text-[#64748B]">{user.role.replace('_', ' ')} • {user.organizationName}</p>
                      </div>
                      {currentUser.role === user.role && <CheckCircle2 className="w-4 h-4 text-[#C85A3F]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content canvas */}
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-[#F7F7F5]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

