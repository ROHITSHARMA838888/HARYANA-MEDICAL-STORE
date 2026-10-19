import React, { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { UPLOADED_HARYANA_LOGO } from '../data/seedData';
import type { ShopSettings } from '../utils/pharmacyLogic';

interface SplashScreenProps {
  settings: ShopSettings;
  onComplete: () => void;
  onSkipToPOS: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  settings,
  onComplete,
  onSkipToPOS,
}) => {
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 3200; // 3.2 seconds smooth splash animation

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (elapsed >= duration) {
        window.clearInterval(interval);
        onComplete();
      }
    }, 80);

    return () => window.clearInterval(interval);
  }, [onComplete]);

  const logoSrc = settings.logoDataUrl || UPLOADED_HARYANA_LOGO;

  return (
    <div
      data-testid="splash-screen"
      role="region"
      aria-label="Haryana Medical Store Application Splash Screen"
      className="fixed inset-0 z-50 min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 text-white flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-y-auto"
    >
      {/* Top Status Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between text-xs text-emerald-200/90 border-b border-white/10 pb-3">
        <span className="font-semibold tracking-wide">
          {settings.shopName} · Official Pharmacy System
        </span>
        <span className="font-mono tabular-nums text-amber-300 font-semibold">
          v2.5.0 · Offline-First POS
        </span>
      </div>

      {/* Center Emblem Logo + Prominent 'Made by Rohit Sharma' Credit */}
      <div className="my-auto py-6 flex flex-col items-center text-center max-w-xl w-full space-y-6">
        {/* High-Quality Animated Pharmacy Emblem */}
        <div className="relative flex flex-col items-center">
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-white p-2.5 border-4 border-amber-400 shadow-2xl flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105">
            <img
              src={logoSrc}
              alt="Haryana Medical Store Official Emblem Logo"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== '/icon.svg') {
                  target.src = '/icon.svg';
                }
              }}
              className="w-full h-full object-contain rounded-full"
            />
          </div>

          {/* Prominent Bold 'Made by Rohit Sharma' Directly Below Logo */}
          <div className="mt-5 flex flex-col items-center">
            <p
              data-testid="splash-creator-credit"
              className="text-2xl sm:text-4xl font-black tracking-tight text-amber-300 drop-shadow-md"
            >
              Made by Rohit Sharma
            </p>
            <div className="mt-2 h-1.5 w-32 rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500" />
          </div>
        </div>

        {/* Store Title & Registration */}
        <div className="space-y-2 pt-1">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            Trust &amp; Care · Complete Pharmacy POS &amp; Inventory
          </p>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {settings.shopName}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-md mx-auto">
            Proprietor: <strong className="text-white">{settings.proprietor}</strong> ·{' '}
            {settings.address}
          </p>
          <p className="text-xs font-mono tabular-nums text-emerald-200/90">
            Contact: {settings.phone} / {settings.altPhone} · {settings.email}
          </p>
        </div>

        {/* Smooth Startup Progress Indicator */}
        <div className="w-full max-w-md space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-emerald-200">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
              Loading FEFO Inventory, GST Billing &amp; Cloud Sync...
            </span>
            <span className="font-mono tabular-nums font-bold text-amber-300">
              {progress}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-950/70 rounded-full overflow-hidden border border-white/15 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-300 to-amber-400 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Immediate Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            data-testid="splash-continue-btn"
            onClick={onComplete}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Continue to Welcome Screen</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-testid="splash-skip-pos-btn"
            onClick={onSkipToPOS}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/15 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Open POS Billing Directly</span>
          </button>
        </div>
      </div>

      {/* Bottom Footer Credits */}
      <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-emerald-200/80 border-t border-white/10 pt-3">
        <span>100% Offline-First PWA &amp; Cloud Auto-Backup Ready</span>
        <span className="font-bold text-amber-300">
          Designed &amp; Made by Rohit Sharma
        </span>
      </div>
    </div>
  );
};
