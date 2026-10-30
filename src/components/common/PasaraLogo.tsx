import React, { useState } from 'react';

interface PasaraLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
  className?: string;
  imgClassName?: string;
  variant?: 'clay' | 'glass' | 'flat';
  theme?: 'light' | 'dark';
}

export const PasaraLogo: React.FC<PasaraLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
  imgClassName = '',
  variant = 'clay',
  theme = 'light',
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  const sizeMap = {
    sm: { box: 'w-7 h-7', text: 'text-xs', sub: 'text-3xs', rounded: 'rounded-lg' },
    md: { box: 'w-9 h-9', text: 'text-sm', sub: 'text-3xs', rounded: 'rounded-xl' },
    lg: { box: 'w-12 h-12', text: 'text-base', sub: 'text-2xs', rounded: 'rounded-2xl' },
    xl: { box: 'w-16 h-16', text: 'text-lg', sub: 'text-xs', rounded: 'rounded-2xl' },
    '2xl': { box: 'w-24 h-24', text: 'text-2xl', sub: 'text-sm', rounded: 'rounded-3xl' },
  };

  const currentSize = sizeMap[size];

  const variantStyles = {
    clay: 'bg-gradient-to-br from-white to-emerald-50 shadow-[3px_4px_12px_rgba(16,185,129,0.14),-2px_-2px_8px_rgba(255,255,255,0.95)] border border-emerald-200/50',
    glass: 'bg-white/80 backdrop-blur-md shadow-sm border border-emerald-300/40',
    flat: 'bg-white border border-slate-200 shadow-2xs',
  }[variant];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Default Pasara.jpeg Logo Container */}
      <div
        className={`${currentSize.box} ${currentSize.rounded} ${variantStyles} shrink-0 flex items-center justify-center overflow-hidden relative p-1 transition-transform group-hover:scale-105`}
        title="Pasara Management"
      >
        {!imageFailed ? (
          <img
            src="/pasara.jpeg"
            alt="Pasara Management"
            onError={() => setImageFailed(true)}
            className={`w-full h-full object-contain ${currentSize.rounded} select-none ${imgClassName}`}
            loading="eager"
          />
        ) : (
          /* Graceful Monogram Fallback */
          <div className="w-full h-full rounded-lg bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-800 flex items-center justify-center">
            <svg
              viewBox="0 0 48 48"
              className="w-full h-full p-1"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="13" y="11" width="5.5" height="26" rx="2.75" fill="#ffffff" />
              <path
                d="M15.75 11h10.5c4.56 0 8.25 3.58 8.25 8s-3.69 8-8.25 8h-10.5v-5.5h10.5c1.52 0 2.75-1.12 2.75-2.5s-1.23-2.5-2.75-2.5h-10.5V11z"
                fill="#ffffff"
              />
              <path d="M22 19l2.2-2.2 2.2 2.2-2.2 2.2z" fill="#6ee7b7" />
              <rect x="22" y="32" width="12" height="4.5" rx="2.25" fill="#34d399" />
            </svg>
          </div>
        )}
      </div>

      {showText && (
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <h1
              className={`font-bold tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              } ${currentSize.text}`}
            >
              Pasara Management
            </h1>
            <span
              className={`text-3xs font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border shadow-2xs ${
                theme === 'dark'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300/60'
              }`}
            >
              ERP
            </span>
          </div>
          <p
            className={`font-medium tracking-wide ${
              theme === 'dark' ? 'text-emerald-400/80' : 'text-emerald-700/80'
            } ${currentSize.sub}`}
          >
            Multi-Branch Retail Suite
          </p>
        </div>
      )}
    </div>
  );
};
export default PasaraLogo;
