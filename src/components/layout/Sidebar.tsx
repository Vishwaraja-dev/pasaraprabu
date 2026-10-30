import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Truck,
  Boxes,
  Store,
  Smartphone,
  QrCode,
  FileText,
  X,
  Store as StoreIcon,
  ChevronRight,
} from 'lucide-react';
import { PasaraLogo } from '../common/PasaraLogo';
import { OWNER_DISPLAY_NAME, OWNER_NAME } from '../../lib/appConfig';

export type NavigationPage =
  | 'dashboard'
  | 'branches'
  | 'employees'
  | 'suppliers'
  | 'purchases'
  | 'inventory'
  | 'offline-sales'
  | 'online-sales'
  | 'upi-manager'
  | 'gst';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const operationsNav = [
    {
      id: 'dashboard' as NavigationPage,
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'branches' as NavigationPage,
      label: 'Branches & Locations',
      icon: Building2,
      badge: 'New',
    },
    {
      id: 'employees' as NavigationPage,
      label: 'Staff & Employees',
      icon: Users,
      badge: undefined,
    },
    {
      id: 'inventory' as NavigationPage,
      label: 'Inventory & Stock',
      icon: Boxes,
      badge: undefined,
    },
    {
      id: 'offline-sales' as NavigationPage,
      label: 'In-Store POS Sales',
      icon: Store,
      badge: undefined,
    },
    {
      id: 'online-sales' as NavigationPage,
      label: 'Online Orders',
      icon: Smartphone,
      badge: undefined,
    },
  ];

  const financeNav = [
    {
      id: 'suppliers' as NavigationPage,
      label: 'Suppliers & GST Verification',
      icon: Truck,
      badge: 'GST',
    },
    {
      id: 'purchases' as NavigationPage,
      label: 'Purchases & Invoices',
      icon: FileText,
      badge: undefined,
    },
    {
      id: 'upi-manager' as NavigationPage,
      label: 'UPI Counter & QR',
      icon: QrCode,
      badge: undefined,
    },
    {
      id: 'gst' as NavigationPage,
      label: 'GST & Tax Center',
      icon: FileText,
      badge: 'Tax',
    },
  ];

  const renderNavGroup = (title: string, items: typeof operationsNav) => (
    <div className="space-y-1 mb-5">
      <div className="px-3 text-2xs font-bold uppercase tracking-wider text-slate-400 mb-2">
        {title}
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onNavigate(item.id);
              onCloseMobile();
            }}
            className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all sm:text-sm ${
              isActive
                ? 'nav-active-glow border border-emerald-400/40 bg-gradient-to-r from-emerald-600 to-teal-600 font-semibold text-white shadow-[0_4px_12px_rgba(5,150,105,0.3)]'
                : 'text-slate-300 hover:translate-x-0.5 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {item.badge && !isActive && (
                <span className="text-3xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
            </div>
          </button>
        );
      })}
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800 bg-slate-950/40">
        <PasaraLogo size="md" showText={true} theme="dark" />
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 px-3 py-4 overflow-y-auto">
        {renderNavGroup('Store Operations', operationsNav)}
        {renderNavGroup('Finance & Tax', financeNav)}
      </div>

      {/* Owner & System Footer */}
      <div className="border-t border-slate-800 bg-slate-950/60 p-3.5">
        <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-700 text-sm font-bold text-white shadow-md shadow-emerald-900/40">
            {OWNER_NAME.charAt(0)}
          </div>
          <div className="min-w-0 leading-tight">
            <span className="block truncate text-xs font-bold text-white">{OWNER_DISPLAY_NAME}</span>
            <span className="block text-3xs text-emerald-400/80">Owner • Administrator</span>
          </div>
          <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">Multi-Branch Active</span>
          </div>
          <span className="font-mono text-3xs text-emerald-400">v2.4 Pro</span>
        </div>
        <div className="mt-1 truncate text-3xs text-slate-400">
          Flagship • Mall • Transit Stores
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-64 max-w-xs shadow-2xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
