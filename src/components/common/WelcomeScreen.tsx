import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { OWNER_DISPLAY_NAME, APP_NAME, getGreeting } from '../../lib/appConfig';
import { PasaraLogo } from './PasaraLogo';

interface WelcomeScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onFinish,
  durationMs = 2100,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - start) / durationMs) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timer);
        exit();
      }
    }, 40);
    return () => clearInterval(timer);
  }, [durationMs]);

  const exit = () => {
    setIsExiting(true);
    window.setTimeout(onFinish, 380);
  };

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center overflow-hidden p-4 transition-all duration-400 ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background:
          'radial-gradient(circle at 15% 20%, #064e3b 0%, #042f2e 38%, #020617 100%)',
      }}
    >
      {/* Animated aurora orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora-orb absolute -left-24 top-10 h-80 w-80 rounded-full bg-emerald-500/30" />
        <div className="aurora-orb-delayed absolute right-0 top-1/3 h-96 w-96 rounded-full bg-teal-400/20" />
        <div className="aurora-orb absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-400/20" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="welcome-particle absolute block h-1 w-1 rounded-full bg-emerald-300/70"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              animationDelay: `${(i % 6) * 0.35}s`,
              animationDuration: `${3 + (i % 4)}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <div className="welcome-pop relative mb-7">
          <div className="absolute -inset-4 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="relative rounded-3xl border border-white/20 bg-white/10 p-2.5 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(16,185,129,0.6)]">
            <PasaraLogo size="2xl" variant="glass" />
          </div>
          <div className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/40">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        </div>

        <div className="welcome-fade-up inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 backdrop-blur-md">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
          <span className="text-3xs font-bold uppercase tracking-[0.2em] text-emerald-200">
            System Ready
          </span>
        </div>

        <p
          className="welcome-fade-up mt-6 text-sm font-medium tracking-wide text-emerald-200/70"
          style={{ animationDelay: '0.08s' }}
        >
          {getGreeting()}, welcome back
        </p>

        <h1
          className="welcome-fade-up mt-1 bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl"
          style={{ animationDelay: '0.16s' }}
        >
          {OWNER_DISPLAY_NAME}
        </h1>

        <p
          className="welcome-fade-up mt-3 max-w-sm text-xs leading-relaxed text-emerald-100/60 sm:text-sm"
          style={{ animationDelay: '0.24s' }}
        >
          Your {APP_NAME} command center is ready. Let&apos;s make today&apos;s retail
          operations exceptional.
        </p>

        <div className="welcome-fade-up mt-8 w-full max-w-xs" style={{ animationDelay: '0.32s' }}>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={exit}
          className="welcome-fade-up group mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:border-emerald-300/40 hover:bg-white/15"
          style={{ animationDelay: '0.4s' }}
        >
          <span>Enter Dashboard</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <div className="absolute bottom-5 text-center text-3xs font-mono text-emerald-200/40">
        {APP_NAME} • Secure Retail Operations
      </div>
    </div>
  );
};

export default WelcomeScreen;
