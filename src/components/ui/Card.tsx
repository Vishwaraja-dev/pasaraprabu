import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  colorScheme?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = 'emerald',
}) => {
  const iconColor = {
    indigo: 'text-slate-800 bg-white/90 border-slate-200/80 shadow-[2px_3px_6px_rgba(15,23,42,0.06),inset_1px_1px_2px_rgba(255,255,255,0.9)]',
    emerald: 'text-emerald-800 bg-emerald-50/90 border-emerald-200/80 shadow-[2px_3px_6px_rgba(16,185,129,0.12),inset_1px_1px_2px_rgba(255,255,255,0.9)]',
    amber: 'text-amber-800 bg-amber-50/90 border-amber-200/80 shadow-[2px_3px_6px_rgba(245,158,11,0.12),inset_1px_1px_2px_rgba(255,255,255,0.9)]',
    rose: 'text-rose-800 bg-rose-50/90 border-rose-200/80 shadow-[2px_3px_6px_rgba(244,63,94,0.12),inset_1px_1px_2px_rgba(255,255,255,0.9)]',
    sky: 'text-sky-800 bg-sky-50/90 border-sky-200/80 shadow-[2px_3px_6px_rgba(14,165,233,0.12),inset_1px_1px_2px_rgba(255,255,255,0.9)]',
    purple: 'text-purple-800 bg-purple-50/90 border-purple-200/80 shadow-[2px_3px_6px_rgba(168,85,247,0.12),inset_1px_1px_2px_rgba(255,255,255,0.9)]',
  }[colorScheme];

  return (
    <div className="clay-card p-4 sm:p-5 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-emerald-900/70 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{value}</span>
        {trend && (
          <span className="text-2xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
            {trend}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
};
export default MetricCard;
