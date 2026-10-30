import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  const normalized = status.toLowerCase();

  // Stock statuses
  if (normalized === 'in stock') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (normalized === 'low stock') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (normalized === 'out of stock') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
  }
  // Payment statuses
  else if (normalized === 'paid' || normalized === 'completed') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (normalized === 'not paid' || normalized === 'unpaid') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
  } else if (normalized === 'partially paid') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (normalized === 'pending') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (normalized === 'refunded') {
    colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (normalized === 'failed') {
    colorClasses = 'bg-red-50 text-red-700 border-red-200';
  }
  // Channels
  else if (normalized === 'whatsapp') {
    colorClasses = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
  } else if (normalized === 'instagram') {
    colorClasses = 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 font-semibold';
  }
  // Order Delivery statuses
  else if (normalized === 'new') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (normalized === 'confirmed') {
    colorClasses = 'bg-teal-50 text-teal-700 border-teal-200';
  } else if (normalized === 'processing') {
    colorClasses = 'bg-teal-50 text-teal-700 border-teal-200';
  } else if (normalized === 'packed') {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (normalized === 'shipped') {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (normalized === 'delivered') {
    colorClasses = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
  } else if (normalized === 'cancelled') {
    colorClasses = 'bg-slate-100 text-slate-500 border-slate-200';
  } else if (normalized === 'returned') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (normalized === 'exchanged') {
    colorClasses = 'bg-teal-50 text-teal-700 border-teal-200';
  }
  // Shops
  else if (normalized === 'shop 1') {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (normalized === 'shop 2') {
    colorClasses = 'bg-teal-50 text-teal-800 border-teal-200';
  } else if (normalized === 'shop 3') {
    colorClasses = 'bg-emerald-100/70 text-emerald-900 border-emerald-300';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg font-semibold border backdrop-blur-xs shadow-2xs ${colorClasses} ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      {status}
    </span>
  );
};
