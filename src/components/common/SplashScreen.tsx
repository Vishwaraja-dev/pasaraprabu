import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Store, QrCode } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number; // total duration before auto-dismiss
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 2400,
}) => {
  const [progress, setProgress] = useState(12);
  const [statusText, setStatusText] = useState('Initializing Pasara Retail Core...');
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / durationMs) * 100), 100);
      setProgress(pct);

      if (pct < 30) {
        setStatusText('Mounting Offline SQLite & IndexedDB Storage...');
      } else if (pct < 65) {
        setStatusText('Syncing Multi-Branch Catalogs & Inventory...');
      } else if (pct < 90) {
        setStatusText('Verifying GST Tax Calculator & UPI Payment Rails...');
      } else {
        setStatusText('System Ready. Welcome to Pasara Management!');
      }

      if (elapsed >= durationMs) {
        clearInterval(interval);
        handleExit();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [durationMs]);

  const handleExit = () => {
    setIsExiting(true);
    setTimeout(() => {
      onFinish();
    }, 450);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundColor: '#eef8f3',
        backgroundImage: `
          radial-gradient(circle at 20% 25%, rgba(167, 243, 208, 0.6) 0%, transparent 45%),
          radial-gradient(circle at 80% 75%, rgba(110, 231, 183, 0.45) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, transparent 60%)
        `,
      }}
    >
      {/* Ambient Glassmorphic Glow Orbs */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 rounded-full bg-emerald-300/30 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 w-80 h-80 rounded-full bg-teal-200/40 blur-3xl pointer-events-none" />

      {/* Main Claymorphic Card Container */}
      <div
        className="relative max-w-lg w-full rounded-3xl p-8 sm:p-10 text-center flex flex-col items-center backdrop-blur-xl border border-white/80"
        style={{
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(236, 253, 245, 0.92) 100%)',
          boxShadow: `
            16px 24px 50px -8px rgba(16, 185, 129, 0.16),
            -12px -12px 32px 0px rgba(255, 255, 255, 1),
            inset 2px 2px 5px rgba(255, 255, 255, 0.95),
            inset -2px -2px 8px rgba(16, 185, 129, 0.06)
          `,
        }}
      >
        {/* Animated Pasara.jpeg Logo Vessel with Claymorphic Bevel & Glass Sheen */}
        <div className="relative mb-6">
          {/* Subtle Outer Green Halo */}
          <div className="absolute -inset-2 rounded-3xl bg-emerald-400/25 blur-xl animate-pulse" />

          {/* Logo Plinth Card */}
          <div
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-3 flex items-center justify-center overflow-hidden border border-emerald-200/70 animate-float-gentle"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
              boxShadow: `
                10px 14px 28px -4px rgba(16, 185, 129, 0.22),
                -8px -8px 20px rgba(255, 255, 255, 0.95),
                inset 2px 2px 4px rgba(255, 255, 255, 0.9),
                inset -2px -2px 6px rgba(16, 185, 129, 0.1)
              `,
            }}
          >
            {/* Logo Image */}
            <img
              src="/pasara.jpeg"
              alt="Pasara Management Logo"
              className="w-full h-full object-contain rounded-2xl select-none"
              onError={(e) => {
                // If direct public file fails, fallback to SVG representation
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />

            {/* Specular Light Sweep Sheen */}
            <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/70 to-transparent animate-logo-sheen pointer-events-none" />
          </div>

          {/* Small Clay Verification Sparkle */}
          <div
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border border-white"
            style={{
              background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
              boxShadow: '2px 4px 10px rgba(5, 150, 105, 0.35)',
            }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Brand Titles */}
        <div className="space-y-1.5 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-300/60 shadow-2xs mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
            <span className="text-3xs uppercase tracking-widest font-bold text-emerald-800">
              Enterprise Retail Suite
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Pasara Management
          </h1>
          <p className="text-xs sm:text-sm text-emerald-800/80 font-medium max-w-xs mx-auto">
            Multi-Branch Inventory, POS, GST & Unified UPI Settlements
          </p>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-7">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-3xs font-semibold bg-white/80 text-emerald-900 border border-emerald-200/60 shadow-2xs">
            <Store className="w-3.5 h-3.5 text-emerald-600" /> Multi-Branch POS
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-3xs font-semibold bg-white/80 text-emerald-900 border border-emerald-200/60 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> GST Verification
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-3xs font-semibold bg-white/80 text-emerald-900 border border-emerald-200/60 shadow-2xs">
            <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Dynamic UPI QR
          </span>
        </div>

        {/* Tactile Progress Indicator */}
        <div className="w-full max-w-xs mb-5">
          <div className="flex items-center justify-between text-3xs font-medium text-emerald-900/80 mb-2">
            <span className="truncate pr-2 font-mono">{statusText}</span>
            <span className="tabular-nums font-bold text-emerald-700">{progress}%</span>
          </div>

          {/* Clay Track */}
          <div
            className="w-full h-3 rounded-full overflow-hidden p-0.5 border border-emerald-200/70"
            style={{
              background: '#e0f2fe',
              backgroundColor: '#e6f4ea',
              boxShadow: 'inset 2px 2px 4px rgba(16, 185, 129, 0.12)',
            }}
          >
            {/* Animated Gradient Bar */}
            <div
              className="h-full rounded-full transition-all duration-150 ease-out relative overflow-hidden"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 1px 4px rgba(5, 150, 105, 0.35)',
              }}
            >
              <div className="absolute inset-0 bg-white/25 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Enter / Skip Button */}
        <button
          type="button"
          onClick={handleExit}
          className="clay-button-primary px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 group cursor-pointer"
        >
          <span>Enter Dashboard</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* Version Tag */}
      <div className="absolute bottom-4 text-center text-3xs text-emerald-800/60 font-mono">
        Pasara Management Engine • v2.4 • Build 2026.10
      </div>
    </div>
  );
};
export default SplashScreen;
