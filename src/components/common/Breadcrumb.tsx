import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Home, ChevronRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuthStore, ROLE_DISPLAY_NAMES } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  customItems?: BreadcrumbItem[];
  showBackButton?: boolean;
  className?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  '': 'Home',
  'command-center': 'Command Center',
  'workflow-operations': 'Workflow Operations',
  'facilities': 'Facility Network',
  'inventory': 'Network Stock',
  'safe-to-share': 'Safe to Share Surplus',
  'expiry-rescue': 'Expiry Rescue & FEFO',
  'requests': 'Transfers & Dispatches',
  'forecasting': 'Demand Analytics',
  'emergency-simulation': 'Emergency Simulation',
  'audit-logs': 'Audit Trail',
  'ai-observability': 'AI Observability',
  'hospital': 'Hospital Unit',
  'blood-bank': 'Blood Bank Hub',
  'logistics': 'Logistics Dispatch',
};

export function Breadcrumb({ customItems, showBackButton = true, className }: BreadcrumbProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();

  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Generate breadcrumb items from URL if custom items are not explicitly provided
  const generatedItems: BreadcrumbItem[] = [
    { label: 'Home', path: '/' }
  ];

  let accumulatedPath = '';
  pathSegments.forEach((segment, index) => {
    accumulatedPath += `/${segment}`;
    const label = ROUTE_LABELS[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    
    // Last segment is current page, no click link needed
    const isLast = index === pathSegments.length - 1;
    generatedItems.push({
      label,
      path: isLast ? undefined : accumulatedPath,
    });
  });

  const items = customItems || generatedItems;

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 px-4 bg-white/80 border-b border-stone-200/80 text-xs select-none backdrop-blur-xs', className)}>
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        {showBackButton && pathSegments.length > 0 && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors font-medium border border-stone-200/80 shadow-2xs mr-1"
            title="Go back to previous page"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#841A2B]" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-stone-500">
          <ol className="flex items-center gap-1.5">
            {items.map((item, index) => {
              const isLast = index === items.length - 1;
              const isHome = index === 0 && item.path === '/';

              return (
                <li key={item.path || `${item.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <ChevronRight className="w-3 h-3 text-stone-400 flex-shrink-0" />
                  )}

                  {isLast ? (
                    <span className="font-semibold text-stone-900 flex items-center gap-1 bg-stone-100/90 px-2 py-0.5 rounded text-stone-900 border border-stone-200/60" aria-current="page">
                      {isHome && <Home className="w-3.5 h-3.5 text-[#841A2B]" />}
                      {item.label}
                    </span>
                  ) : item.path ? (
                    <Link
                      to={item.path}
                      className="hover:text-stone-900 hover:underline transition-colors flex items-center gap-1 font-medium text-stone-600"
                    >
                      {isHome && <Home className="w-3.5 h-3.5 text-stone-400" />}
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-stone-600 font-medium flex items-center gap-1">
                      {isHome && <Home className="w-3.5 h-3.5 text-stone-400" />}
                      {item.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Role Context Tag */}
      <div className="hidden md:flex items-center gap-1.5 text-[11px] text-stone-500">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FDF2F4] text-[#841A2B] font-semibold border border-[#841A2B]/20">
          <ShieldCheck className="w-3 h-3 text-[#841A2B]" />
          {ROLE_DISPLAY_NAMES[currentUser.role]} Context
        </span>
      </div>
    </div>
  );
}
