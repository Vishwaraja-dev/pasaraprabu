import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-gradient-to-br from-white/80 to-emerald-50/50 px-4 py-12 text-center backdrop-blur-md">
      <div className="animate-float-gentle mb-3 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 p-3 text-emerald-600 ring-8 ring-emerald-50/50">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-base font-bold text-emerald-950">{title}</h3>
      <p className="mt-1 mb-4 max-w-sm text-sm text-emerald-800/60">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:-translate-y-0.5 hover:from-emerald-500 hover:to-teal-500"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
