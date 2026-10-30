import React from 'react';
import { Menu, Database, Calendar, Sparkles } from 'lucide-react';
import { NavigationPage } from './Sidebar';
import { PasaraLogo } from '../common/PasaraLogo';
import { OWNER_DISPLAY_NAME, OWNER_NAME, getGreeting } from '../../lib/appConfig';

interface HeaderProps {
  currentPage: NavigationPage;
  onOpenMobileMenu: () => void;
  onOpenSupabaseModal: () => void;
  isSupabaseConnected: boolean;
  onReplaySplash?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onOpenMobileMenu,
  onOpenSupabaseModal,
  isSupabaseConnected,
  onReplaySplash,
}) => {
  const pageTitles: Record<NavigationPage, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Executive Dashboard',
      subtitle: 'Overview of retail performance, inventory valuation, supplier balances & revenue',
    },
    branches: {
      title: 'Branches & Locations',
      subtitle: 'Store addresses, contact numbers, facility details and employee allocations',
    },
    employees: {
      title: 'Staff & Employees',
      subtitle: 'Employee directory, salary payroll, KYC documents and assigned store branches',
    },
    suppliers: {
      title: 'Suppliers & GST Verification',
      subtitle: 'Real-time GSTIN authentication, verified vendor profiles & registered tax details',
    },
    purchases: {
      title: 'Stock Purchases & Invoices',
      subtitle: 'Supplier ledger, purchase invoices, payment settlements and credit tracking',
    },
    inventory: {
      title: 'Inventory & Stock Management',
      subtitle: 'Central catalog, branch stock levels, low-stock warnings and adjustments',
    },
    'offline-sales': {
      title: 'In-Store POS Sales',
      subtitle: 'Point of sale billing, instant invoices, cash/card/UPI receipting and returns',
    },
    'online-sales': {
      title: 'Online Orders (WhatsApp / IG)',
      subtitle: 'Customer orders received via WhatsApp, Instagram DM and digital channels',
    },
    'upi-manager': {
      title: 'UPI Payment Counter & Dynamic QR',
      subtitle: 'Instant dynamic amount QR generator, customer display mode and payment status',
    },
    gst: {
      title: 'GST Compliance & Tax Center',
      subtitle: 'Output GST liability, Input Tax Credit (ITC), HSN tariff rates and GSTR worksheets',
    },
  };

  const current = pageTitles[currentPage] || {
    title: 'Pasara Management',
    subtitle: 'Enterprise multi-branch retail suite',
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-20 bg-white/75 backdrop-blur-xl border-b border-emerald-200/50 px-4 sm:px-8 py-3 flex items-center justify-between shadow-[0_4px_20px_-4px_rgba(16,185,129,0.06)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-70" />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 text-emerald-900 hover:text-emerald-950 hover:bg-emerald-100/60 rounded-xl transition-colors border border-emerald-200/40"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Header Brand & Title */}
        <div className="lg:hidden flex items-center gap-2">
          <PasaraLogo size="sm" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 leading-tight">Pasara Management</span>
            <span className="text-3xs text-emerald-800/80 font-medium truncate max-w-[170px]">
              {current.title}
            </span>
          </div>
        </div>

        {/* Desktop Header Brand Title */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-2 text-2xs font-semibold text-emerald-700 mb-0.5">
            <span className="font-bold tracking-wide">Pasara Management</span>
            <span className="text-emerald-400">/</span>
            <span className="text-slate-600">{current.title}</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
            {current.title}
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block leading-tight">{current.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Personalized Owner Chip */}
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50/90 to-teal-50/80 px-2 py-1.5 shadow-2xs">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-xs font-bold text-white shadow-sm shadow-emerald-600/30">
            {OWNER_NAME.charAt(0)}
          </div>
          <div className="hidden text-left leading-tight sm:block">
            <span className="block text-3xs font-medium text-emerald-700/70">
              {getGreeting()}
            </span>
            <span className="block text-xs font-bold text-emerald-950">{OWNER_DISPLAY_NAME}</span>
          </div>
        </div>

        {/* Splash Animation Replay Button */}
        {onReplaySplash && (
          <button
            type="button"
            onClick={onReplaySplash}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-[2px_3px_6px_rgba(16,185,129,0.06)]"
            title="Replay Pasara Logo Splash Screen"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Splash Animation</span>
          </button>
        )}

        {/* Date Display */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-emerald-900 bg-white/80 border border-emerald-200/60 px-3 py-1.5 rounded-xl shadow-2xs backdrop-blur-sm">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>{todayFormatted}</span>
        </div>

        {/* Supabase Status Button */}
        <button
          type="button"
          onClick={onOpenSupabaseModal}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all shadow-2xs backdrop-blur-sm ${
            isSupabaseConnected
              ? 'bg-emerald-50/90 text-emerald-900 border-emerald-300/80 hover:bg-emerald-100/80'
              : 'bg-white/90 text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          title="Supabase Database Settings"
        >
          <Database className={`w-3.5 h-3.5 ${isSupabaseConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">
            {isSupabaseConnected ? 'Cloud DB Connected' : 'Connect DB'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
            }`}
          />
        </button>
      </div>
    </header>
  );
};
export default Header;
