import React, { useState } from 'react';
import {
  Save,
  Download,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  Smartphone,
  ShieldCheck,
  HardDrive,
  Cloud,
  CloudUpload,
  CloudDownload,
  FolderOpen,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  RotateCcw,
  Layers,
  GitBranch,
} from 'lucide-react';
import type { ShopSettings } from '../utils/pharmacyLogic';
import {
  APP_CURRENT_VERSION,
  DEFAULT_GITHUB_REPO,
  INTERNAL_FOLDERS,
  type GitHubReleaseCheckResult,
  type OfflineQueueItem,
} from '../utils/storageAndSyncLogic';
import type { InternalStorageFileMeta, InternalStorageHealth } from '../utils/internalStorage';
import type { CloudBackupMetadata } from '../utils/firebaseSync';

interface SettingsViewProps {
  settings: ShopSettings;
  setSettings: React.Dispatch<React.SetStateAction<ShopSettings>>;
  userRole: 'Owner' | 'Staff';
  setUserRole: (role: 'Owner' | 'Staff') => void;
  onLockPOS: () => void;
  openImageStudio: () => void;
  triggerUpdateBanner: () => void;
  onExportJSONBackup: () => void;
  onImportJSONBackup: (file: File | undefined, mode?: 'merge' | 'replace') => void;
  // Internal Storage Separate Actions
  internalStorageHealth: InternalStorageHealth | null;
  internalBackups: InternalStorageFileMeta[];
  onSaveInternalBackup: (note?: string) => Promise<void>;
  onRestoreInternalBackup: (fullPath: string, mode: 'merge' | 'replace') => Promise<void>;
  onDeleteInternalBackup: (fullPath: string) => Promise<void>;
  onExportInternalBackupFile: (fullPath: string) => Promise<void>;
  // Firebase Real-Time Sync, Offline Queue & Safe Cloud Backup/Restore
  realtimeSyncEnabled: boolean;
  setRealtimeSyncEnabled: (enabled: boolean) => void;
  realtimeSyncStatus: 'connected' | 'syncing' | 'offline' | 'error';
  realtimeSyncDetail: string;
  lastRealtimeSyncAt: string;
  onPushRealtimeSyncNow: () => Promise<void>;
  offlineQueue: OfflineQueueItem[];
  onFlushOfflineQueue: () => Promise<void>;
  onClearOfflineQueue: () => void;
  cloudBackupMeta: CloudBackupMetadata | null;
  cloudActionBusy: boolean;
  onCreateSafeCloudBackup: (note?: string) => Promise<void>;
  onRefreshCloudBackupMeta: () => Promise<void>;
  onSafeCloudRestore: (mode: 'merge' | 'replace') => Promise<void>;
  // GitHub Release Updater
  githubRepoSlug: string;
  setGithubRepoSlug: (slug: string) => void;
  githubReleaseInfo: GitHubReleaseCheckResult | null;
  checkingGithubUpdate: boolean;
  onCheckGithubReleaseUpdate: () => Promise<void>;
  // PWA Install
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
  onExportJSONBackup,
  onImportJSONBackup,
  internalStorageHealth,
  internalBackups,
  onSaveInternalBackup,
  onRestoreInternalBackup,
  onDeleteInternalBackup,
  onExportInternalBackupFile,
  realtimeSyncEnabled,
  setRealtimeSyncEnabled,
  realtimeSyncStatus,
  realtimeSyncDetail,
  lastRealtimeSyncAt,
  onPushRealtimeSyncNow,
  offlineQueue,
  onFlushOfflineQueue,
  onClearOfflineQueue,
  cloudBackupMeta,
  cloudActionBusy,
  onCreateSafeCloudBackup,
  onRefreshCloudBackupMeta,
  onSafeCloudRestore,
  githubRepoSlug,
  setGithubRepoSlug,
  githubReleaseInfo,
  checkingGithubUpdate,
  onCheckGithubReleaseUpdate,
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

  const [ownerNewPass, setOwnerNewPass] = useState(settings.ownerPass);
  const [ownerNewPin, setOwnerNewPin] = useState(settings.ownerPin);
  const [staffNewPass, setStaffNewPass] = useState(settings.staffPass);
  const [staffNewPin, setStaffNewPin] = useState(settings.staffPin);
  const [backupNote, setBackupNote] = useState('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [folderTab, setFolderTab] = useState<'all' | 'backups' | 'safety_snapshots'>('all');

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerNewPass.trim() || !staffNewPass.trim()) {
      showToast('Owner and Staff passwords cannot be empty.', 'error');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      ownerPass: ownerNewPass.trim(),
      ownerPin: ownerNewPin.trim() || '1234',
      staffPass: staffNewPass.trim(),
      staffPin: staffNewPin.trim() || '0000',
    }));
    showToast('Owner & Staff passwords and PINs securely updated in local encrypted storage!');
  };

  const filteredInternalFiles = internalBackups.filter((f) =>
    folderTab === 'all' ? true : f.category === folderTab
  );

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-5">
      {/* 1. Internal Storage Folder & Separate Backup / Restore Center */}
      <div
        data-testid="internal-storage-card"
        className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs shadow-2xs"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                <HardDrive className="w-3.5 h-3.5" />
                Internal Storage Engine Ready
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Root: {internalStorageHealth?.rootFolder || 'InternalData/HaryanaMedicalStore'} (
                {internalStorageHealth?.storageBackend === 'capacitor-android'
                  ? 'Capacitor Android Native FS'
                  : 'IndexedDB + Persistent Storage'}
                )
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Internal Storage Folder &amp; Separate Backup / Restore Actions
            </h2>
            <p className="text-slate-500">
              Dedicated internal folders for manual backups (<code className="font-mono">{INTERNAL_FOLDERS.BACKUPS}</code>), automatic pre-restore safety snapshots (<code className="font-mono">{INTERNAL_FOLDERS.SAFETY_SNAPSHOTS}</code>), and external JSON file exports (<code className="font-mono">{INTERNAL_FOLDERS.EXPORTS}</code>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
              Backups: <strong>{internalStorageHealth?.backupCount ?? internalBackups.length}</strong> · Used:{' '}
              <strong>{formatBytes(internalStorageHealth?.totalUsedBytes || 0)}</strong>
            </div>
          </div>
        </div>

        {/* Folder Architecture Status Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <FolderOpen className="w-3 h-3 shrink-0" /> Backups Folder
            </span>
            <p className="font-mono font-bold text-[10px] sm:text-[11px] break-all leading-tight mt-1">
              {INTERNAL_FOLDERS.BACKUPS}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 shrink-0" /> Safety Snapshots
            </span>
            <p className="font-mono font-bold text-[10px] sm:text-[11px] break-all leading-tight mt-1">
              {INTERNAL_FOLDERS.SAFETY_SNAPSHOTS}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <Download className="w-3 h-3 shrink-0" /> Exports Folder
            </span>
            <p className="font-mono font-bold text-[10px] sm:text-[11px] break-all leading-tight mt-1">
              {INTERNAL_FOLDERS.EXPORTS}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400 flex items-center gap-1">
              <Layers className="w-3 h-3 shrink-0" /> Offline Queue Folder
            </span>
            <p className="font-mono font-bold text-[10px] sm:text-[11px] break-all leading-tight mt-1">
              {INTERNAL_FOLDERS.OFFLINE_QUEUE}
            </p>
          </div>
        </div>

        {/* Separate Storage Actions Grid: (1) Internal Backup, (2) Internal Restore Mode, (3) External Export, (4) External Import */}
        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          {/* Action Group A: Create Backup (Internal Storage vs External File) */}
          <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900/60 space-y-2.5">
            <p className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-700" />
              Separate Backup Actions (Internal Folder vs. External File)
            </p>
            <input
              type="text"
              value={backupNote}
              onChange={(e) => setBackupNote(e.target.value)}
              placeholder="Optional backup label (e.g. Before evening stock audit)"
              className="w-full px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="btn-internal-backup"
                onClick={() => {
                  void onSaveInternalBackup(backupNote.trim() || undefined);
                  setBackupNote('');
                }}
                className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer shadow-2xs"
              >
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                Save Backup to Internal Folder
              </button>
              <button
                type="button"
                data-testid="btn-export-json"
                onClick={onExportJSONBackup}
                className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                Export JSON File
              </button>
            </div>
          </div>

          {/* Action Group B: Separate Restore Actions (Restore Mode + External File Import) */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/25 border border-blue-200 dark:border-blue-900/60 space-y-2.5">
            <p className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-blue-700" />
              Separate Restore Actions &amp; Safety Mode
            </p>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800">
              <button
                type="button"
                onClick={() => setRestoreMode('merge')}
                className={`py-1.5 px-2 rounded-md font-bold text-[11px] cursor-pointer ${
                  restoreMode === 'merge'
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Safe Merge (Keep Existing)
              </button>
              <button
                type="button"
                onClick={() => setRestoreMode('replace')}
                className={`py-1.5 px-2 rounded-md font-bold text-[11px] cursor-pointer ${
                  restoreMode === 'replace'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Full Replace (Overwrite)
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {internalBackups.length > 0 && (
                <button
                  type="button"
                  data-testid="btn-restore-latest-internal"
                  onClick={() => void onRestoreInternalBackup(internalBackups[0].fullPath, restoreMode)}
                  className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  Restore Latest Internal Snapshot
                </button>
              )}
              <label
                data-testid="label-import-json"
                className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 font-bold cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                Restore from External JSON File
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    onImportJSONBackup(e.target.files?.[0], restoreMode);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Saved Internal Storage Backups & Safety Snapshots List */}
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: `All Internal Files (${internalBackups.length})` },
                  {
                    id: 'backups',
                    label: `Manual Backups (${
                      internalBackups.filter((b) => b.category === 'backups').length
                    })`,
                  },
                  {
                    id: 'safety_snapshots',
                    label: `Pre-Restore Safety Snapshots (${
                      internalBackups.filter((b) => b.category === 'safety_snapshots').length
                    })`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setFolderTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] cursor-pointer ${
                    folderTab === tab.id
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500">
              Every restore automatically creates a rollback snapshot in{' '}
              <code className="font-mono">safety_snapshots/</code>
            </span>
          </div>

          {filteredInternalFiles.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
              No backup snapshots in this internal folder yet. Click &ldquo;Save Backup to Internal
              Folder&rdquo; above to create one now.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredInternalFiles.map((file) => (
                <div
                  key={file.fullPath}
                  data-testid="internal-backup-row"
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          file.category === 'safety_snapshots'
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        {file.category === 'safety_snapshots' ? 'Safety Snapshot' : 'Internal Backup'}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white truncate">
                        {file.fileName}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        ({formatBytes(file.sizeBytes)} · {file.checksum})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Path: {file.fullPath} · Saved:{' '}
                      {new Date(file.createdAt).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Records: <strong>{file.recordCounts.medicines}</strong> Meds ·{' '}
                      <strong>{file.recordCounts.batches}</strong> Batches ·{' '}
                      <strong>{file.recordCounts.sales}</strong> Bills ·{' '}
                      <strong>{file.recordCounts.customers}</strong> Customers
                      {file.note ? ` — "${file.note}"` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void onRestoreInternalBackup(file.fullPath, 'merge')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] cursor-pointer"
                    >
                      Restore (Merge)
                    </button>
                    <button
                      type="button"
                      onClick={() => void onRestoreInternalBackup(file.fullPath, 'replace')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] cursor-pointer"
                    >
                      Restore (Replace)
                    </button>
                    <button
                      type="button"
                      onClick={() => void onExportInternalBackupFile(file.fullPath)}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold text-[11px] cursor-pointer"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteInternalBackup(file.fullPath)}
                      aria-label={`Delete ${file.fileName}`}
                      className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Firebase Real-Time Sync, Offline Queue & Safe Cloud Backup / Restore */}
      <div
        data-testid="firebase-sync-card"
        className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs shadow-2xs"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="realtime-sync-status-badge"
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${
                  realtimeSyncStatus === 'connected'
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                    : realtimeSyncStatus === 'syncing'
                      ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300'
                      : realtimeSyncStatus === 'offline'
                        ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                        : 'bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300'
                }`}
              >
                {realtimeSyncStatus === 'offline' ? (
                  <WifiOff className="w-3.5 h-3.5" />
                ) : (
                  <Wifi className="w-3.5 h-3.5" />
                )}
                {realtimeSyncStatus === 'connected' && 'Firebase Real-Time Listener Active'}
                {realtimeSyncStatus === 'syncing' && 'Syncing with Firestore...'}
                {realtimeSyncStatus === 'offline' && 'Offline — Queueing Changes'}
                {realtimeSyncStatus === 'error' && 'Sync Attention Needed'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">{realtimeSyncDetail}</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Firebase Real-Time Sync (<code className="font-mono">onSnapshot</code>), Offline Queue &amp; Safe Cloud Backup
            </h2>
            <p className="text-slate-500">
              Real-time Firestore listener syncs bills and stock across terminals, queues mutations offline in <code className="font-mono">offline_queue/</code>, and keeps verified Cloud Backups separate from live sync.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRealtimeSyncEnabled(!realtimeSyncEnabled)}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
                realtimeSyncEnabled
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {realtimeSyncEnabled ? 'Real-Time Sync: ON' : 'Real-Time Sync: PAUSED'}
            </button>
            <button
              type="button"
              data-testid="btn-push-live-sync"
              onClick={() => void onPushRealtimeSyncNow()}
              disabled={cloudActionBusy}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-bold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cloudActionBusy ? 'animate-spin' : ''}`} />
              Sync Now
            </button>
          </div>
        </div>

        {/* Two Columns: (A) Safe Cloud Backup & Restore (Separate Actions) | (B) Offline Sync Queue Manager */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* (A) Separate Safe Cloud Backup & Safe Cloud Restore */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-emerald-700" />
                Safe Cloud Backup &amp; Cloud Restore
              </p>
              <button
                type="button"
                data-testid="btn-check-cloud-meta"
                onClick={() => void onRefreshCloudBackupMeta()}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Refresh Cloud Status
              </button>
            </div>

            {cloudBackupMeta ? (
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Cloud Snapshot Found
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {cloudBackupMeta.checksum}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-500">
                  Last Cloud Backup:{' '}
                  {cloudBackupMeta.lastCloudSync
                    ? new Date(cloudBackupMeta.lastCloudSync).toLocaleString('en-IN')
                    : settings.lastBackupTime}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Cloud Records: <strong>{cloudBackupMeta.recordCounts.medicines}</strong> Meds ·{' '}
                  <strong>{cloudBackupMeta.recordCounts.batches}</strong> Batches ·{' '}
                  <strong>{cloudBackupMeta.recordCounts.sales}</strong> Bills ·{' '}
                  <strong>{cloudBackupMeta.recordCounts.customers}</strong> Customers
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500">
                Last Sync: <span className="font-mono">{lastRealtimeSyncAt || settings.lastBackupTime}</span>. Click &ldquo;Create Safe Cloud Backup&rdquo; to store a verified snapshot in Firestore.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="btn-cloud-backup"
                disabled={cloudActionBusy}
                onClick={() => void onCreateSafeCloudBackup('Manual Safe Cloud Backup')}
                className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer shadow-2xs"
              >
                <CloudUpload className="w-3.5 h-3.5 shrink-0" />
                Create Safe Cloud Backup
              </button>
              <button
                type="button"
                data-testid="btn-cloud-restore-merge"
                disabled={cloudActionBusy}
                onClick={() => void onSafeCloudRestore('merge')}
                className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold cursor-pointer shadow-2xs"
              >
                <CloudDownload className="w-3.5 h-3.5 shrink-0" />
                Cloud Restore (Safe Merge)
              </button>
              <button
                type="button"
                data-testid="btn-cloud-restore-replace"
                disabled={cloudActionBusy}
                onClick={() => void onSafeCloudRestore('replace')}
                className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
              >
                <CloudDownload className="w-3.5 h-3.5 shrink-0" />
                Cloud Restore (Replace)
              </button>
            </div>
          </div>

          {/* (B) Offline Sync Queue Manager */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Offline Sync Queue ({offlineQueue.length} Pending)
                </p>
                {offlineQueue.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-bold text-[10px]">
                    {offlineQueue.length} Queued
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                When offline or on unstable rural networks, POS sales, stock updates, and cloud backups are queued in <code className="font-mono">{INTERNAL_FOLDERS.OFFLINE_QUEUE}</code> and auto-flushed when back online.
              </p>

              {offlineQueue.length === 0 ? (
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  All local pharmacy transactions are synced. Offline queue is empty (0 pending).
                </div>
              ) : (
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {offlineQueue.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-2 text-[11px]"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                          [{item.actionType}]
                        </span>{' '}
                        <span className="truncate">{item.summary}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 shrink-0">
                        Retries: {item.retryCount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                data-testid="btn-flush-offline-queue"
                onClick={() => void onFlushOfflineQueue()}
                disabled={offlineQueue.length === 0 || cloudActionBusy}
                className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-bold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Flush Offline Queue Now ({offlineQueue.length})
              </button>
              {offlineQueue.length > 0 && (
                <button
                  type="button"
                  onClick={onClearOfflineQueue}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 font-semibold cursor-pointer"
                >
                  Clear Queue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. GitHub Release Based Updater & Signed APK Manager */}
      <div
        data-testid="github-updater-card"
        className="bg-emerald-50/90 dark:bg-emerald-950/30 rounded-2xl p-4 sm:p-5 border border-emerald-500/40 space-y-3.5 text-xs"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-800 text-white font-mono font-bold text-[11px]">
                <GitBranch className="w-3 h-3" /> Installed v{APP_CURRENT_VERSION}
              </span>
              {githubReleaseInfo && (
                <span
                  data-testid="github-release-status-badge"
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${
                    githubReleaseInfo.hasUpdate
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  {githubReleaseInfo.hasUpdate
                    ? `Update Available: ${githubReleaseInfo.tagName}`
                    : `Latest Release: ${githubReleaseInfo.tagName}`}
                </span>
              )}
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-emerald-950 dark:text-emerald-100">
              GitHub Release Based Auto-Updater &amp; Signed Android APK
            </h3>
            <p className="text-emerald-800 dark:text-emerald-300">
              Checks live GitHub Releases API (<code className="font-mono">/repos/{githubRepoSlug || DEFAULT_GITHUB_REPO}/releases/latest</code>) for new <code className="font-mono">.apk</code> builds and PWA service worker updates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="btn-check-github-release"
              onClick={() => void onCheckGithubReleaseUpdate()}
              disabled={checkingGithubUpdate}
              className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingGithubUpdate ? 'animate-spin' : ''}`} />
              {checkingGithubUpdate ? 'Checking GitHub Releases...' : 'Check GitHub Release Update'}
            </button>
            <a
              href={
                githubReleaseInfo?.apkAsset?.downloadUrl || '/haryana-medical-store-release.apk'
              }
              download={githubReleaseInfo?.apkAsset?.name || 'HaryanaMedicalStore-Release.apk'}
              data-testid="link-download-release-apk"
              className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download APK (
              {formatBytes(githubReleaseInfo?.apkAsset?.sizeBytes || 3565158)})
            </a>
          </div>
        </div>

        {/* Repository Input & Release Details */}
        <div className="grid sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label
              htmlFor="github-repo-input"
              className="block font-semibold text-emerald-900 dark:text-emerald-200 mb-1"
            >
              GitHub Repository (owner/repo)
            </label>
            <input
              id="github-repo-input"
              type="text"
              value={githubRepoSlug}
              onChange={(e) => setGithubRepoSlug(e.target.value)}
              placeholder="rohitsharma22057/haryana-medical-store"
              className="w-full px-3 py-2 rounded-xl border border-emerald-500/50 bg-white dark:bg-slate-900 font-mono text-xs"
            />
          </div>

          <div className="sm:col-span-2 p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-emerald-500/30 space-y-1">
            {githubReleaseInfo ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {githubReleaseInfo.releaseName} ({githubReleaseInfo.tagName})
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    Checked: {new Date(githubReleaseInfo.checkedAt).toLocaleTimeString('en-IN')}
                  </span>
                </div>
                <p className="text-emerald-800 dark:text-emerald-300 font-medium">
                  {githubReleaseInfo.message}
                </p>
                <p className="text-[11px] text-slate-500 line-clamp-2 font-mono">
                  Notes: {githubReleaseInfo.releaseNotes}
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Click &ldquo;Check GitHub Release Update&rdquo; to query{' '}
                  <code className="font-mono">{githubRepoSlug || DEFAULT_GITHUB_REPO}</code> for the
                  latest APK &amp; release changelog.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Shop Identity & Legal Registration Form */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Shop Identity, GSTIN &amp; Drug Licence Settings
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

      {/* 5. Separated Owner & Staff Credential Management & Change Password */}
      <form
        onSubmit={handleSaveCredentials}
        className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Change Password &amp; Role Credential Management (Owner vs. Staff)
            </h3>
            <p className="text-slate-500">
              Separately manage Owner and Staff login usernames, passwords, and 4-digit security PINs
            </p>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Update Passwords &amp; PINs
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <p className="font-bold text-emerald-800 dark:text-emerald-300">
              Owner Account ({settings.proprietor}) — Full Administrative Access
            </p>
            <div className="grid sm:grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="cred-owner-user" className="block text-[11px] text-slate-500 mb-1">
                  Owner Username
                </label>
                <input
                  id="cred-owner-user"
                  type="text"
                  value={settings.ownerUser}
                  onChange={(e) => setSettings((p) => ({ ...p, ownerUser: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div>
                <label htmlFor="cred-owner-pass" className="block text-[11px] text-slate-500 mb-1">
                  New Owner Password
                </label>
                <input
                  id="cred-owner-pass"
                  type="password"
                  value={ownerNewPass}
                  onChange={(e) => setOwnerNewPass(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div>
                <label htmlFor="cred-owner-pin" className="block text-[11px] text-slate-500 mb-1">
                  Owner 4-Digit PIN
                </label>
                <input
                  id="cred-owner-pin"
                  type="password"
                  maxLength={4}
                  value={ownerNewPin}
                  onChange={(e) => setOwnerNewPin(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Pharmacy Staff Account — POS Billing &amp; Stock Entry Only
            </p>
            <div className="grid sm:grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="cred-staff-user" className="block text-[11px] text-slate-500 mb-1">
                  Staff Username
                </label>
                <input
                  id="cred-staff-user"
                  type="text"
                  value={settings.staffUser}
                  onChange={(e) => setSettings((p) => ({ ...p, staffUser: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div>
                <label htmlFor="cred-staff-pass" className="block text-[11px] text-slate-500 mb-1">
                  New Staff Password
                </label>
                <input
                  id="cred-staff-pass"
                  type="password"
                  value={staffNewPass}
                  onChange={(e) => setStaffNewPass(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div>
                <label htmlFor="cred-staff-pin" className="block text-[11px] text-slate-500 mb-1">
                  Staff 4-Digit PIN
                </label>
                <input
                  id="cred-staff-pin"
                  type="password"
                  maxLength={4}
                  value={staffNewPin}
                  onChange={(e) => setStaffNewPin(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 6. 3-Image Reference Studio & Role Access Control */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          3-Image Reference Studio &amp; Role Access Control
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
  );
};
