import React from 'react';
import {
  Save,
  Download,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import type { ShopSettings } from '../utils/pharmacyLogic';

interface SettingsViewProps {
  settings: ShopSettings;
  setSettings: React.Dispatch<React.SetStateAction<ShopSettings>>;
  userRole: 'Owner' | 'Staff';
  setUserRole: (role: 'Owner' | 'Staff') => void;
  onLockPOS: () => void;
  openImageStudio: () => void;
  triggerUpdateBanner: () => void;
  onExportJSONBackup: () => void;
  onImportJSONBackup: (file: File | undefined) => void;
  isInstallable: boolean;
  isInstalled: boolean;
  onInstallPWA: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  setSettings,
  userRole,
  setUserRole,
  onLockPOS,
  openImageStudio,
  triggerUpdateBanner,
  onExportJSONBackup,
  onImportJSONBackup,
  isInstallable,
  isInstalled,
  onInstallPWA,
  showToast,
}) => {
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(
      'Shop identity, GSTIN, Drug Licence No., and alert thresholds saved! Synced across all invoices & headers.'
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Shop Identity & Legal Registration Form */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Shop Identity, GSTIN & Drug Licence Settings
            </h2>
            <p className="text-xs text-slate-500">
              When GSTIN or Drug Licence Number is filled below, it automatically appears on all
              PDF Invoices and the top bar
            </p>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Save Settings
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-3.5">
          <div>
            <label htmlFor="set-shop-name" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              Shop Name
            </label>
            <input
              id="set-shop-name"
              type="text"
              value={settings.shopName}
              onChange={(e) => setSettings((p) => ({ ...p, shopName: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-semibold"
            />
          </div>
          <div>
            <label htmlFor="set-prop" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              Proprietor Name
            </label>
            <input
              id="set-prop"
              type="text"
              value={settings.proprietor}
              onChange={(e) => setSettings((p) => ({ ...p, proprietor: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
            />
          </div>
          <div>
            <label htmlFor="set-email" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              Email Address
            </label>
            <input
              id="set-email"
              type="email"
              value={settings.email}
              onChange={(e) => setSettings((p) => ({ ...p, email: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="set-address" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              Full Shop Address
            </label>
            <input
              id="set-address"
              type="text"
              value={settings.address}
              onChange={(e) => setSettings((p) => ({ ...p, address: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
            />
          </div>

          <div>
            <label htmlFor="set-phone" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              Primary Phone
            </label>
            <input
              id="set-phone"
              type="tel"
              value={settings.phone}
              onChange={(e) => setSettings((p) => ({ ...p, phone: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
            />
          </div>
          <div>
            <label htmlFor="set-alt-phone" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              Alternate Phone
            </label>
            <input
              id="set-alt-phone"
              type="tel"
              value={settings.altPhone}
              onChange={(e) => setSettings((p) => ({ ...p, altPhone: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
            />
          </div>
          <div>
            <label htmlFor="set-gstin" className="block font-medium text-emerald-700 dark:text-emerald-400 mb-1">
              GSTIN (Blank initially — auto-shows on bills)
            </label>
            <input
              id="set-gstin"
              type="text"
              placeholder="e.g. 06ABCDE1234F1Z5"
              value={settings.gstin}
              onChange={(e) => setSettings((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
              className="w-full px-3 py-2 rounded-lg border border-emerald-500/60 bg-transparent font-mono"
            />
          </div>

          <div>
            <label htmlFor="set-dl" className="block font-medium text-emerald-700 dark:text-emerald-400 mb-1">
              Drug Licence Number (D.L. No.)
            </label>
            <input
              id="set-dl"
              type="text"
              placeholder="e.g. HR-NUH-123456 / 123457"
              value={settings.drugLicence}
              onChange={(e) => setSettings((p) => ({ ...p, drugLicence: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-emerald-500/60 bg-transparent font-mono"
            />
          </div>
          <div>
            <label htmlFor="set-low-stock" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              Default Low Stock Threshold
            </label>
            <input
              id="set-low-stock"
              type="number"
              min={1}
              value={settings.lowStockThreshold}
              onChange={(e) =>
                setSettings((p) => ({ ...p, lowStockThreshold: Number(e.target.value || 20) }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
            />
          </div>
          <div>
            <label htmlFor="set-exp-days" className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
              Near-Expiry Alert Window (Days)
            </label>
            <input
              id="set-exp-days"
              type="number"
              min={7}
              value={settings.expiryAlertDays}
              onChange={(e) =>
                setSettings((p) => ({ ...p, expiryAlertDays: Number(e.target.value || 60) }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
            />
          </div>
        </div>
      </form>

      {/* 2. Backup, Restore, 3-Image Studio, Updates & Access Control */}
      <div className="grid md:grid-cols-2 gap-4 text-xs">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Offline JSON Backup, Restore & App Updates
          </h3>
          <p className="text-slate-500">
            Last Local Auto-Backup: <span className="font-mono">{settings.lastBackupTime}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExportJSONBackup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export Full JSON Backup
            </button>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Import / Restore JSON
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => onImportJSONBackup(e.target.files?.[0])}
              />
            </label>
            <button
              type="button"
              onClick={triggerUpdateBanner}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Check for App Updates
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            3-Image Reference Studio & Role Access Control
          </h3>
          <p className="text-slate-500">
            Active Session Role: <span className="font-bold text-emerald-700">{userRole}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openImageStudio}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" /> Open 3-Image Studio
            </button>
            <button
              type="button"
              onClick={() => setUserRole(userRole === 'Owner' ? 'Staff' : 'Owner')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Switch to{' '}
              {userRole === 'Owner' ? 'Staff Mode' : 'Owner Mode'}
            </button>
            <button
              type="button"
              onClick={onLockPOS}
              className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
            >
              Lock POS Terminal
            </button>
            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={onInstallPWA}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 text-white font-semibold cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" /> Install Standalone App
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Free-Tier & Android APK Packaging Guide & Direct Download */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 sm:p-5 border border-emerald-500/40 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-200">
              Signed Android APK Ready for Download
            </h3>
            <p className="text-emerald-700 dark:text-emerald-300">
              The production-ready release APK (<code className="font-mono">haryana-medical-store-release.apk</code>) signed with <code className="font-mono">haryana-pos.jks</code> is fully compiled and ready.
            </p>
          </div>
          <a
            href="/haryana-medical-store-release.apk"
            download="HaryanaMedicalStore-Release.apk"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download Signed APK (3.4 MB)
          </a>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-slate-600 dark:text-slate-400 border-t border-emerald-500/20 pt-3">
          <div className="space-y-1">
            <p className="font-semibold text-slate-900 dark:text-white">
              Zero Paid APIs (100% Free Forever):
            </p>
            <p>
              • Database: Offline-first IndexedDB / LocalStorage with 1-click JSON export & restore.
            </p>
            <p>
              • Calls & SMS: Uses native Android/iOS URI schemes (<code className="font-mono">tel:</code>,{' '}
              <code className="font-mono">sms:</code>, <code className="font-mono">mailto:</code>)
              with zero SMS gateway fees.
            </p>
            <p>
              • In-App PDF Invoices: Native vector print/HTML engine inside the app modal.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-slate-900 dark:text-white">
              Build Signed Android APK via Capacitor or PWABuilder:
            </p>
            <p className="font-mono text-[11px]">
              1. npm run build &amp;&amp; npx cap init &quot;Haryana Medical Store&quot; com.haryanamedical.pos
            </p>
            <p className="font-mono text-[11px]">
              2. npx cap add android &amp;&amp; npx cap sync android
            </p>
            <p className="font-mono text-[11px]">
              3. npx cap open android → Build → Generate Signed Bundle / APK
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
