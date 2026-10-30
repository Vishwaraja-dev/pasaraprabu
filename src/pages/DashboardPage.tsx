import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Package,
  Plus,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { DashboardStats, RecentActivityItem } from '../types';
import { getDashboardStats, getRecentActivity } from '../lib/dataService';
import { StatusBadge } from '../components/ui/StatusBadge';
import { NavigationPage } from '../components/layout/Sidebar';
import { OWNER_DISPLAY_NAME, getGreeting } from '../lib/appConfig';

interface DashboardPageProps {
  onNavigate: (page: NavigationPage) => void;
}

type Accent = 'emerald' | 'sky' | 'amber' | 'violet' | 'rose' | 'teal';

const accentStyles: Record<
  Accent,
  { icon: string; glow: string; bar: string; soft: string; text: string }
> = {
  emerald: {
    icon: 'bg-emerald-500 text-white shadow-emerald-500/30',
    glow: 'from-emerald-400/20 to-teal-400/5',
    bar: 'from-emerald-500 to-teal-400',
    soft: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-600',
  },
  teal: {
    icon: 'bg-teal-500 text-white shadow-teal-500/30',
    glow: 'from-teal-400/20 to-cyan-400/5',
    bar: 'from-teal-500 to-cyan-400',
    soft: 'bg-teal-50 text-teal-700 border-teal-200',
    text: 'text-teal-600',
  },
  sky: {
    icon: 'bg-sky-500 text-white shadow-sky-500/30',
    glow: 'from-sky-400/20 to-indigo-400/5',
    bar: 'from-sky-500 to-indigo-400',
    soft: 'bg-sky-50 text-sky-700 border-sky-200',
    text: 'text-sky-600',
  },
  amber: {
    icon: 'bg-amber-500 text-white shadow-amber-500/30',
    glow: 'from-amber-400/20 to-orange-400/5',
    bar: 'from-amber-500 to-orange-400',
    soft: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-600',
  },
  violet: {
    icon: 'bg-violet-500 text-white shadow-violet-500/30',
    glow: 'from-violet-400/20 to-fuchsia-400/5',
    bar: 'from-violet-500 to-fuchsia-400',
    soft: 'bg-violet-50 text-violet-700 border-violet-200',
    text: 'text-violet-600',
  },
  rose: {
    icon: 'bg-rose-500 text-white shadow-rose-500/30',
    glow: 'from-rose-400/20 to-pink-400/5',
    bar: 'from-rose-500 to-pink-400',
    soft: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-600',
  },
};

function useCountUp(target: number, duration = 950, decimals = 0) {
  const [display, setDisplay] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    const from = previous.current;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        previous.current = target;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  const factor = Math.pow(10, decimals);
  return Math.round(display * factor) / factor;
}

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
  delay?: number;
  badge?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  subtitle,
  icon: Icon,
  accent,
  delay = 0,
  badge,
}) => {
  const animated = useCountUp(value, 950, decimals);
  const style = accentStyles[accent];

  return (
    <div
      className="group relative animate-fade-up overflow-hidden rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_10px_35px_-18px_rgba(16,185,129,0.45)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-18px_rgba(16,185,129,0.5)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${style.glow} blur-2xl transition-opacity duration-300 group-hover:opacity-100`}
      />
      <div className="relative flex items-start justify-between">
        <div className={`rounded-xl p-2.5 shadow-lg ${style.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        {badge && (
          <span
            className={`rounded-full border px-2 py-0.5 text-3xs font-bold uppercase tracking-wider ${style.soft}`}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="relative mt-4">
        <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {prefix}
            {animated.toLocaleString('en-US', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })}
            {suffix}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="relative mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${style.bar} animate-bar-grow`}
          style={{ width: `${Math.min(100, 45 + (value % 50))}%` }}
        />
      </div>
    </div>
  );
};

const MiniBars: React.FC<{ values: { label: string; value: number; color: string }[] }> = ({
  values,
}) => {
  const max = Math.max(...values.map((v) => v.value), 1);
  return (
    <div className="flex h-32 items-end justify-around gap-3">
      {values.map((v, i) => (
        <div key={v.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="text-3xs font-bold text-slate-500 tabular-nums">
            ${v.value >= 1000 ? `${(v.value / 1000).toFixed(1)}k` : v.value.toFixed(0)}
          </span>
          <div className="relative flex w-full max-w-[42px] flex-1 items-end overflow-hidden rounded-t-lg bg-slate-100/80">
            <div
              className={`w-full rounded-t-lg ${v.color} animate-bar-rise`}
              style={{
                height: `${Math.max(8, (v.value / max) * 100)}%`,
                animationDelay: `${i * 90}ms`,
              }}
            />
          </div>
          <span className="text-center text-3xs font-medium leading-tight text-slate-400">
            {v.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [s, a] = await Promise.all([getDashboardStats(), getRecentActivity()]);
    setStats(s);
    setActivities(a);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-5">
        <div className="h-44 animate-pulse rounded-3xl bg-gradient-to-r from-emerald-200/60 to-teal-100/60" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl border border-white/70 bg-white/70"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="h-72 animate-pulse rounded-2xl border border-white/70 bg-white/70 lg:col-span-2" />
          <div className="h-72 animate-pulse rounded-2xl border border-white/70 bg-white/70" />
        </div>
      </div>
    );
  }

  const monthlyTotal = Math.max(stats.monthlyTotalSales, 1);
  const offlineShare = Math.round((stats.monthlyOfflineSales / monthlyTotal) * 100);
  const onlineShare = Math.max(0, 100 - offlineShare);
  const inStock = Math.max(0, stats.totalProducts - stats.lowStockProducts - stats.outOfStockProducts);
  const healthyPct = stats.totalProducts > 0 ? Math.round((inStock / stats.totalProducts) * 100) : 100;

  const pipelineTotal = Math.max(
    1,
    stats.newOrders + stats.processingOrders + stats.deliveredOrders + stats.pendingOnlinePayments
  );

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="hero-panel relative overflow-hidden rounded-3xl p-6 text-white shadow-[0_30px_80px_-30px_rgba(4,120,87,0.65)] sm:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="aurora-orb absolute -left-10 -top-16 h-64 w-64 rounded-full bg-emerald-400/30" />
          <div className="aurora-orb-delayed absolute -right-10 top-10 h-72 w-72 rounded-full bg-cyan-400/20" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:38px_38px] [mask-image:radial-gradient(ellipse_at_top_left,black_10%,transparent_70%)]" />
        </div>

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <div className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              <span className="text-3xs font-bold uppercase tracking-[0.18em] text-emerald-100">
                Live Business Overview
              </span>
            </div>

            <h1
              className="mt-4 animate-fade-up text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl"
              style={{ animationDelay: '80ms' }}
            >
              {getGreeting()},{' '}
              <span className="bg-gradient-to-r from-emerald-200 via-teal-100 to-cyan-200 bg-clip-text text-transparent">
                {OWNER_DISPLAY_NAME}
              </span>
            </h1>
            <p
              className="mt-2 max-w-xl animate-fade-up text-sm text-emerald-50/70"
              style={{ animationDelay: '150ms' }}
            >
              {todayFormatted} • Here is how your stores are performing right now across POS,
              online channels and inventory.
            </p>

            <div
              className="mt-5 flex animate-fade-up flex-wrap items-center gap-2.5"
              style={{ animationDelay: '220ms' }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />$
                {stats.todayTotalSales.toLocaleString('en-US', { maximumFractionDigits: 0 })} today
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                <Package className="h-3.5 w-3.5 text-cyan-300" />
                {stats.totalProducts} SKUs
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                {stats.lowStockProducts + stats.outOfStockProducts} stock alerts
              </span>
            </div>

            <div
              className="mt-6 flex animate-fade-up flex-wrap items-center gap-2.5"
              style={{ animationDelay: '290ms' }}
            >
              <button
                type="button"
                onClick={() => onNavigate('offline-sales')}
                className="group inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-lg shadow-emerald-950/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4" />
                New In-Store Sale
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('online-sales')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/20"
              >
                <Smartphone className="h-4 w-4" />
                Create Online Order
              </button>
              <button
                type="button"
                onClick={() => onNavigate('upi-manager')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/20"
              >
                <QrCode className="h-4 w-4" />
                UPI Counter
              </button>
            </div>
          </div>

          {/* Revenue Ring */}
          <div
            className="animate-fade-up rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl"
            style={{ animationDelay: '360ms' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xs font-bold uppercase tracking-[0.18em] text-emerald-200/70">
                  Monthly Revenue
                </span>
                <p className="mt-0.5 text-lg font-extrabold tabular-nums">
                  ${stats.monthlyTotalSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-2 py-0.5 text-3xs font-bold text-emerald-200">
                <Sparkles className="h-3 w-3" /> This month
              </span>
            </div>

            <div className="mt-4 flex items-center gap-5">
              <div
                className="hero-ring relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#34d399 0% ${offlineShare}%, #22d3ee ${offlineShare}% 100%)`,
                }}
              >
                <div className="flex h-[86px] w-[86px] flex-col items-center justify-center rounded-full bg-emerald-950/85 backdrop-blur-md">
                  <span className="text-lg font-extrabold tabular-nums">{offlineShare}%</span>
                  <span className="text-3xs text-emerald-200/70">in-store</span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-2xs">
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-100">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" /> In-Store
                    </span>
                    <span className="font-bold tabular-nums">{offlineShare}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 animate-bar-grow"
                      style={{ width: `${offlineShare}%` }}
                    />
                  </div>
                  <span className="mt-1 block text-3xs text-emerald-100/60 tabular-nums">
                    ${stats.monthlyOfflineSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-2xs">
                    <span className="flex items-center gap-1.5 font-semibold text-cyan-100">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" /> Online
                    </span>
                    <span className="font-bold tabular-nums">{onlineShare}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-300 animate-bar-grow"
                      style={{ width: `${onlineShare}%` }}
                    />
                  </div>
                  <span className="mt-1 block text-3xs text-cyan-100/60 tabular-nums">
                    ${stats.monthlyOnlineSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KPI CARDS */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Revenue"
          value={stats.todayTotalSales}
          prefix="$"
          decimals={2}
          subtitle="Combined omnichannel revenue"
          icon={Wallet}
          accent="emerald"
          delay={40}
          badge="Live"
        />
        <StatCard
          title="In-Store Sales"
          value={stats.todayOfflineSales}
          prefix="$"
          decimals={2}
          subtitle="Physical POS receipts today"
          icon={Store}
          accent="teal"
          delay={110}
        />
        <StatCard
          title="Online Sales"
          value={stats.todayOnlineSales}
          prefix="$"
          decimals={2}
          subtitle="WhatsApp & Instagram orders"
          icon={Smartphone}
          accent="sky"
          delay={180}
        />
        <StatCard
          title="Pending Payments"
          value={stats.pendingOnlinePayments}
          suffix=" orders"
          subtitle="Awaiting customer settlement"
          icon={Clock}
          accent="amber"
          delay={250}
          badge={stats.pendingOnlinePayments > 0 ? 'Action' : 'Clear'}
        />
      </section>

      {/* REVENUE + INVENTORY */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div
          className="animate-fade-up rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_12px_40px_-22px_rgba(15,23,42,0.25)] backdrop-blur-xl lg:col-span-2"
          style={{ animationDelay: '120ms' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <span className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                  <TrendingUp className="h-4 w-4" />
                </span>
                Revenue Performance
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Month-to-date sales velocity across both channels
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('offline-sales')}
              className="group inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
            >
              View ledger
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-[1fr_1.15fr] sm:items-center">
            <div className="space-y-4">
              <div>
                <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Monthly Revenue
                </span>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                  ${stats.monthlyTotalSales.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50/60 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-800">Monthly In-Store</span>
                  <span className="font-bold text-emerald-950 tabular-nums">
                    ${stats.monthlyOfflineSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 animate-bar-grow"
                    style={{ width: `${offlineShare}%` }}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 to-indigo-50/60 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-sky-800">Monthly Online</span>
                  <span className="font-bold text-sky-950 tabular-nums">
                    ${stats.monthlyOnlineSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-400 animate-bar-grow"
                    style={{ width: `${onlineShare}%` }}
                  />
                </div>
              </div>
            </div>

            <MiniBars
              values={[
                {
                  label: 'Today In-Store',
                  value: stats.todayOfflineSales,
                  color: 'bg-gradient-to-t from-emerald-600 to-emerald-300',
                },
                {
                  label: 'Today Online',
                  value: stats.todayOnlineSales,
                  color: 'bg-gradient-to-t from-sky-600 to-sky-300',
                },
                {
                  label: 'Month In-Store',
                  value: stats.monthlyOfflineSales,
                  color: 'bg-gradient-to-t from-teal-600 to-teal-300',
                },
                {
                  label: 'Month Online',
                  value: stats.monthlyOnlineSales,
                  color: 'bg-gradient-to-t from-indigo-600 to-indigo-300',
                },
              ]}
            />
          </div>
        </div>

        <div
          className="animate-fade-up rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_12px_40px_-22px_rgba(15,23,42,0.25)] backdrop-blur-xl"
          style={{ animationDelay: '190ms' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className="rounded-lg bg-violet-100 p-1.5 text-violet-700">
                <Boxes className="h-4 w-4" />
              </span>
              Inventory Health
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
            >
              Catalog
            </button>
          </div>

          <div className="mt-5 flex items-center gap-5">
            <div
              className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#8b5cf6 0% ${healthyPct}%, #e2e8f0 ${healthyPct}% 100%)`,
              }}
            >
              <div className="flex h-[74px] w-[74px] flex-col items-center justify-center rounded-full bg-white">
                <span className="text-lg font-extrabold text-slate-900 tabular-nums">
                  {healthyPct}%
                </span>
                <span className="text-3xs text-slate-400">healthy</span>
              </div>
            </div>
            <div className="flex-1 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-violet-500" /> In Stock
                </span>
                <span className="font-bold text-slate-900 tabular-nums">{inStock}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Low Stock
                </span>
                <span className="font-bold text-amber-700 tabular-nums">{stats.lowStockProducts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Out of Stock
                </span>
                <span className="font-bold text-rose-700 tabular-nums">
                  {stats.outOfStockProducts}
                </span>
              </div>
            </div>
          </div>

          {stats.lowStockProducts + stats.outOfStockProducts > 0 ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-2xs leading-relaxed text-amber-900">
                <strong>{stats.outOfStockProducts} out of stock</strong> and{' '}
                <strong>{stats.lowStockProducts} low stock</strong> items need replenishment.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-2xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              Inventory levels are healthy across all branches.
            </div>
          )}

          <button
            type="button"
            onClick={() => onNavigate('purchases')}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-violet-600/20 transition-all hover:-translate-y-0.5 hover:from-violet-500 hover:to-indigo-500"
          >
            <Zap className="h-3.5 w-3.5" /> Replenish Stock
          </button>
        </div>
      </section>

      {/* SUPPLIERS + ONLINE PIPELINE */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div
          className="animate-fade-up rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_12px_40px_-22px_rgba(15,23,42,0.25)] backdrop-blur-xl"
          style={{ animationDelay: '120ms' }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <Truck className="h-4 w-4" />
              </span>
              Supplier Payables
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('purchases')}
              className="group inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
            >
              Manage
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: 'Suppliers', value: `${stats.totalSuppliers}`, cls: 'bg-slate-50 border-slate-200 text-slate-900' },
              {
                label: 'Purchases',
                value: `$${stats.totalPurchaseAmount.toFixed(0)}`,
                cls: 'bg-slate-50 border-slate-200 text-slate-900',
              },
              {
                label: 'Paid',
                value: `$${stats.totalPaidAmount.toFixed(0)}`,
                cls: 'bg-emerald-50 border-emerald-200 text-emerald-700',
              },
              {
                label: 'Pending',
                value: `$${stats.totalPendingAmount.toFixed(0)}`,
                cls: 'bg-rose-50 border-rose-200 text-rose-700',
              },
            ].map((m) => (
              <div key={m.label} className={`rounded-xl border p-2.5 text-center ${m.cls}`}>
                <span className="block text-3xs font-semibold uppercase tracking-wider opacity-70">
                  {m.label}
                </span>
                <span className="mt-0.5 block text-sm font-extrabold tabular-nums">{m.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                Outstanding Balances
              </span>
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-3xs font-bold text-rose-600">
                {stats.suppliersWithPending.length} open
              </span>
            </div>
            {stats.suppliersWithPending.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                All supplier invoices are fully settled.
              </div>
            ) : (
              <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                {stats.suppliersWithPending.map((sup, i) => (
                  <div
                    key={sup.id}
                    className="animate-fade-up flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-3xs font-bold text-white">
                        {sup.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">{sup.name}</span>
                        <span className="block truncate text-3xs text-slate-500">{sup.contact}</span>
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 font-bold text-rose-600 tabular-nums">
                      ${sup.pendingAmount.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className="animate-fade-up rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_12px_40px_-22px_rgba(15,23,42,0.25)] backdrop-blur-xl"
          style={{ animationDelay: '190ms' }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className="rounded-lg bg-sky-100 p-1.5 text-sky-700">
                <Smartphone className="h-4 w-4" />
              </span>
              Online Orders Pipeline
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('online-sales')}
              className="group inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
            >
              Open orders
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div className="mt-4 space-y-3.5">
            {[
              {
                label: 'New Orders',
                value: stats.newOrders,
                color: 'from-emerald-500 to-teal-400',
                dot: 'bg-emerald-500',
                hint: 'Awaiting confirmation',
              },
              {
                label: 'Processing',
                value: stats.processingOrders,
                color: 'from-sky-500 to-indigo-400',
                dot: 'bg-sky-500',
                hint: 'Picking & packing',
              },
              {
                label: 'Delivered',
                value: stats.deliveredOrders,
                color: 'from-violet-500 to-fuchsia-400',
                dot: 'bg-violet-500',
                hint: 'Completed shipments',
              },
              {
                label: 'Pending Payment',
                value: stats.pendingOnlinePayments,
                color: 'from-amber-500 to-orange-400',
                dot: 'bg-amber-500',
                hint: 'Payment links to send',
              },
            ].map((row, i) => {
              const pct = Math.round((row.value / pipelineTotal) * 100);
              return (
                <div key={row.label} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-slate-700">
                      <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                      {row.label}
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">{row.value}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${row.color} animate-bar-grow`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                  <span className="mt-1 block text-3xs text-slate-400">{row.hint}</span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('upi-manager')}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-sky-600/20 transition-all hover:-translate-y-0.5 hover:from-sky-500 hover:to-indigo-500"
          >
            <QrCode className="h-3.5 w-3.5" /> Collect UPI Payments
          </button>
        </div>
      </section>

      {/* QUICK MODULES */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            Quick Launchpad
          </h3>
          <span className="text-2xs font-medium text-slate-400">Jump into any module</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              title: 'Store Branches',
              desc: 'Addresses & headcount',
              icon: Building2,
              accent: 'emerald' as Accent,
              page: 'branches' as NavigationPage,
              badge: 'New',
            },
            {
              title: 'GST Center',
              desc: 'ITC & tax worksheets',
              icon: FileText,
              accent: 'violet' as Accent,
              page: 'gst' as NavigationPage,
              badge: 'Tax',
            },
            {
              title: 'UPI Counter',
              desc: 'Live dynamic scan',
              icon: QrCode,
              accent: 'sky' as Accent,
              page: 'upi-manager' as NavigationPage,
              badge: 'POS',
            },
            {
              title: 'Employees',
              desc: 'Salary & KYC proofs',
              icon: Users,
              accent: 'amber' as Accent,
              page: 'employees' as NavigationPage,
              badge: 'Staff',
            },
          ].map((item, i) => {
            const Icon = item.icon;
            const style = accentStyles[item.accent];
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => onNavigate(item.page)}
                className="group animate-fade-up relative overflow-hidden rounded-2xl border border-white/80 bg-white/85 p-4 text-left shadow-[0_8px_30px_-18px_rgba(15,23,42,0.3)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_16px_40px_-18px_rgba(16,185,129,0.4)]"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${style.glow} blur-2xl`}
                />
                <div className="relative flex items-center justify-between">
                  <span className={`rounded-xl p-2 shadow-lg ${style.icon}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-3xs font-bold uppercase tracking-wider ${style.soft}`}
                  >
                    {item.badge}
                  </span>
                </div>
                <div className="relative mt-3">
                  <span className="block text-xs font-bold text-slate-900 transition-colors group-hover:text-emerald-700">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-2xs text-slate-500">{item.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* RECENT ACTIVITY */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
              <Clock className="h-3.5 w-3.5" />
            </span>
            Recent Business Transactions
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('offline-sales')}
            className="group inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/85 shadow-[0_12px_40px_-22px_rgba(15,23,42,0.25)] backdrop-blur-xl">
          {activities.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No recent activity recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activities.map((act, i) => (
                <div
                  key={act.id}
                  className="animate-fade-up flex items-center justify-between gap-3 p-3.5 text-xs transition-colors hover:bg-emerald-50/40"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        act.type === 'offline_sale'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : act.type === 'online_order'
                          ? 'border-sky-200 bg-sky-50 text-sky-700'
                          : act.type === 'purchase'
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-violet-200 bg-violet-50 text-violet-700'
                      }`}
                    >
                      {act.type === 'offline_sale' && <Store className="h-4 w-4" />}
                      {act.type === 'online_order' && <Smartphone className="h-4 w-4" />}
                      {act.type === 'purchase' && <Truck className="h-4 w-4" />}
                      {act.type === 'supplier_payment' && <DollarSign className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate font-bold text-slate-900">{act.title}</span>
                      <span className="block truncate text-2xs text-slate-500">{act.subtitle}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 text-right">
                    {act.statusBadge && <StatusBadge status={act.statusBadge} size="sm" />}
                    <div>
                      <span className="block font-mono text-sm font-bold text-slate-900 tabular-nums">
                        ${Number(act.amount).toFixed(2)}
                      </span>
                      <span className="block text-2xs text-slate-400">{act.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
