import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import {
  INTERNAL_STORAGE_ROOT,
  INTERNAL_FOLDERS,
  createBackupPayload,
  validateBackupPayload,
  type BackupPayload,
  type BackupRecordCounts,
  type OfflineQueueItem,
  type PharmacyStateSnapshot,
} from './storageAndSyncLogic';

export type InternalFolderCategory = 'backups' | 'safety_snapshots' | 'exports' | 'offline_queue';

export interface InternalStorageFileMeta {
  fileName: string;
  folderPath: string;
  fullPath: string;
  category: 'backups' | 'safety_snapshots';
  createdAt: string;
  sizeBytes: number;
  checksum: string;
  note?: string;
  recordCounts: BackupRecordCounts;
  storageBackend: 'capacitor-android' | 'indexeddb-internal';
}

export interface InternalStorageHealth {
  ready: boolean;
  storageBackend: 'capacitor-android' | 'indexeddb-internal';
  rootFolder: string;
  folders: string[];
  backupCount: number;
  safetySnapshotCount: number;
  totalUsedBytes: number;
  lastCheckedAt: string;
}

const IDB_DB_NAME = 'HaryanaMedicalStore_InternalFS_v1';
const IDB_STORE_FILES = 'internal_files';
const LS_META_INDEX_KEY = 'hms_internal_storage_index_v1';
const LS_OFFLINE_QUEUE_KEY = 'hms_offline_sync_queue_v1';

interface StoredInternalFileRecord {
  fullPath: string;
  fileName: string;
  category: InternalFolderCategory;
  createdAt: string;
  sizeBytes: number;
  checksum: string;
  note?: string;
  recordCounts: BackupRecordCounts;
  content: string;
}

function openInternalIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE_FILES)) {
          db.createObjectStore(IDB_STORE_FILES, { keyPath: 'fullPath' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPutFile(record: StoredInternalFileRecord): Promise<boolean> {
  const db = await openInternalIDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_FILES, 'readwrite');
      const store = tx.objectStore(IDB_STORE_FILES);
      store.put(record);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

async function idbGetFile(fullPath: string): Promise<StoredInternalFileRecord | null> {
  const db = await openInternalIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_FILES, 'readonly');
      const store = tx.objectStore(IDB_STORE_FILES);
      const req = store.get(fullPath);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as StoredInternalFileRecord) || null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

async function idbDeleteFile(fullPath: string): Promise<boolean> {
  const db = await openInternalIDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_FILES, 'readwrite');
      const store = tx.objectStore(IDB_STORE_FILES);
      store.delete(fullPath);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

async function idbListAllFiles(): Promise<StoredInternalFileRecord[]> {
  const db = await openInternalIDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_FILES, 'readonly');
      const store = tx.objectStore(IDB_STORE_FILES);
      const req = store.getAll();
      req.onsuccess = () => {
        db.close();
        resolve((req.result as StoredInternalFileRecord[]) || []);
      };
      req.onerror = () => {
        db.close();
        resolve([]);
      };
    } catch {
      db.close();
      resolve([]);
    }
  });
}

function readLocalMetaIndex(): InternalStorageFileMeta[] {
  try {
    const raw = localStorage.getItem(LS_META_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalMetaIndex(items: InternalStorageFileMeta[]): void {
  try {
    localStorage.setItem(LS_META_INDEX_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota errors
  }
}

export function getFolderPathForCategory(category: InternalFolderCategory): string {
  switch (category) {
    case 'backups':
      return INTERNAL_FOLDERS.BACKUPS;
    case 'safety_snapshots':
      return INTERNAL_FOLDERS.SAFETY_SNAPSHOTS;
    case 'exports':
      return INTERNAL_FOLDERS.EXPORTS;
    case 'offline_queue':
      return INTERNAL_FOLDERS.OFFLINE_QUEUE;
  }
}

/**
 * Ensures the internal storage folder hierarchy exists on Android Capacitor (Directory.Data)
 * and initializes the IndexedDB virtual internal filesystem on Web/PWA.
 */
export async function ensureInternalStorageFolders(): Promise<InternalStorageHealth> {
  const isNative = Capacitor.isNativePlatform();
  const folders = [
    INTERNAL_STORAGE_ROOT,
    INTERNAL_FOLDERS.BACKUPS,
    INTERNAL_FOLDERS.SAFETY_SNAPSHOTS,
    INTERNAL_FOLDERS.EXPORTS,
    INTERNAL_FOLDERS.OFFLINE_QUEUE,
  ];

  if (isNative) {
    for (const folder of folders) {
      try {
        await Filesystem.mkdir({
          path: folder,
          directory: Directory.Data,
          recursive: true,
        });
      } catch {
        // Folder already exists
      }
    }
  }

  await openInternalIDB();
  const allBackups = await listInternalBackups('all');
  const backupCount = allBackups.filter((b) => b.category === 'backups').length;
  const safetySnapshotCount = allBackups.filter((b) => b.category === 'safety_snapshots').length;
  const totalUsedBytes = allBackups.reduce((acc, b) => acc + Number(b.sizeBytes || 0), 0);

  return {
    ready: true,
    storageBackend: isNative ? 'capacitor-android' : 'indexeddb-internal',
    rootFolder: `InternalData/${INTERNAL_STORAGE_ROOT}`,
    folders,
    backupCount,
    safetySnapshotCount,
    totalUsedBytes,
    lastCheckedAt: new Date().toLocaleString('en-IN'),
  };
}

/**
 * Separate Action 1: Save a backup snapshot directly into the Internal Storage Folder
 * (`HaryanaMedicalStore/backups/` or `HaryanaMedicalStore/safety_snapshots/`).
 */
export async function saveBackupToInternalStorage(
  state: PharmacyStateSnapshot,
  category: 'backups' | 'safety_snapshots' = 'backups',
  note?: string
): Promise<InternalStorageFileMeta> {
  await ensureInternalStorageFolders();

  const isNative = Capacitor.isNativePlatform();
  const now = new Date();
  const datePart = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const prefix = category === 'safety_snapshots' ? 'HMS-Safety-PreRestore' : 'HMS-Internal-Backup';
  const fileName = `${prefix}-${datePart}.json`;
  const folderPath = getFolderPathForCategory(category);
  const fullPath = `${folderPath}/${fileName}`;

  const payload = createBackupPayload(
    state,
    category === 'safety_snapshots' ? 'SAFETY_SNAPSHOT' : 'INTERNAL_STORAGE',
    {
      note:
        note ||
        (category === 'safety_snapshots'
          ? 'Automatic Pre-Restore Safety Snapshot'
          : 'Manual Internal Storage Backup'),
      exportedAt: now.toISOString(),
    }
  );

  const jsonContent = JSON.stringify(payload, null, 2);
  const sizeBytes = new Blob([jsonContent]).size;

  if (isNative) {
    try {
      await Filesystem.writeFile({
        path: fullPath,
        data: jsonContent,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
        recursive: true,
      });
    } catch (err) {
      console.warn('Capacitor Filesystem write fallback to IDB:', err);
    }
  }

  // Always mirror in IndexedDB + metadata index for instant listing and cross-platform reliability
  await idbPutFile({
    fullPath,
    fileName,
    category,
    createdAt: payload.exportedAt,
    sizeBytes,
    checksum: payload.checksum,
    note: payload.note,
    recordCounts: payload.recordCounts,
    content: jsonContent,
  });

  // Also cache latest backup payload in localStorage fallback for headless/private contexts
  try {
    localStorage.setItem(`hms_internal_file_${fullPath}`, jsonContent);
  } catch {
    // Ignore quota limit
  }

  const meta: InternalStorageFileMeta = {
    fileName,
    folderPath,
    fullPath,
    category,
    createdAt: payload.exportedAt,
    sizeBytes,
    checksum: payload.checksum,
    note: payload.note,
    recordCounts: payload.recordCounts,
    storageBackend: isNative ? 'capacitor-android' : 'indexeddb-internal',
  };

  const existingIndex = readLocalMetaIndex().filter((item) => item.fullPath !== fullPath);
  const updatedIndex = [meta, ...existingIndex].slice(0, 30);
  writeLocalMetaIndex(updatedIndex);

  return meta;
}

/**
 * Separate Action 2: List all backup files stored inside the Internal Storage Folder.
 */
export async function listInternalBackups(
  category: 'backups' | 'safety_snapshots' | 'all' = 'all'
): Promise<InternalStorageFileMeta[]> {
  const isNative = Capacitor.isNativePlatform();
  const idbFiles = await idbListAllFiles();
  const map = new Map<string, InternalStorageFileMeta>();

  for (const item of readLocalMetaIndex()) {
    if (category === 'all' || item.category === category) {
      map.set(item.fullPath, item);
    }
  }

  for (const f of idbFiles) {
    if (f.category !== 'backups' && f.category !== 'safety_snapshots') continue;
    if (category !== 'all' && f.category !== category) continue;
    map.set(f.fullPath, {
      fileName: f.fileName,
      folderPath: getFolderPathForCategory(f.category),
      fullPath: f.fullPath,
      category: f.category,
      createdAt: f.createdAt,
      sizeBytes: f.sizeBytes,
      checksum: f.checksum,
      note: f.note,
      recordCounts: f.recordCounts,
      storageBackend: isNative ? 'capacitor-android' : 'indexeddb-internal',
    });
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Separate Action 3: Read & validate a specific backup file from the Internal Storage Folder.
 */
export async function readBackupFromInternalStorage(
  fullPath: string
): Promise<{ ok: boolean; error?: string; payload?: BackupPayload }> {
  const isNative = Capacitor.isNativePlatform();
  let rawJson: string | null = null;

  if (isNative) {
    try {
      const res = await Filesystem.readFile({
        path: fullPath,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      if (typeof res.data === 'string') {
        rawJson = res.data;
      }
    } catch {
      // Fallback to IDB
    }
  }

  if (!rawJson) {
    const idbRecord = await idbGetFile(fullPath);
    if (idbRecord && idbRecord.content) {
      rawJson = idbRecord.content;
    }
  }

  if (!rawJson) {
    try {
      rawJson = localStorage.getItem(`hms_internal_file_${fullPath}`);
    } catch {
      rawJson = null;
    }
  }

  if (!rawJson) {
    return {
      ok: false,
      error: `Backup file not found in internal storage at ${fullPath}`,
    };
  }

  try {
    const parsed = JSON.parse(rawJson);
    const validation = validateBackupPayload(parsed);
    if (!validation.valid || !validation.payload) {
      return {
        ok: false,
        error: validation.errors.join(' '),
      };
    }
    return {
      ok: true,
      payload: validation.payload,
    };
  } catch {
    return {
      ok: false,
      error: 'Internal backup file contains corrupted JSON.',
    };
  }
}

/**
 * Separate Action 4: Delete a backup snapshot from the Internal Storage Folder.
 */
export async function deleteBackupFromInternalStorage(fullPath: string): Promise<boolean> {
  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    try {
      await Filesystem.deleteFile({
        path: fullPath,
        directory: Directory.Data,
      });
    } catch {
      // Ignore if not on native disk
    }
  }

  await idbDeleteFile(fullPath);
  try {
    localStorage.removeItem(`hms_internal_file_${fullPath}`);
  } catch {
    // Ignore
  }

  const nextIndex = readLocalMetaIndex().filter((i) => i.fullPath !== fullPath);
  writeLocalMetaIndex(nextIndex);
  return true;
}

/**
 * Separate Action 5: Export a backup snapshot from Internal Storage to the user's device Downloads.
 */
export async function exportInternalBackupFileToDevice(fullPath: string): Promise<boolean> {
  const readRes = await readBackupFromInternalStorage(fullPath);
  if (!readRes.ok || !readRes.payload) return false;

  const fileName = fullPath.split('/').pop() || `HaryanaMedicalStore-Backup.json`;
  const jsonStr = JSON.stringify(readRes.payload, null, 2);

  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.writeFile({
        path: `${INTERNAL_FOLDERS.EXPORTS}/${fileName}`,
        data: jsonStr,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
    } catch {
      // Continue to browser download fallback
    }
  }

  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Offline Queue Persistence in Internal Storage (`HaryanaMedicalStore/offline_queue/pending_queue.json`)
 */
export async function saveOfflineQueueToStorage(queue: OfflineQueueItem[]): Promise<void> {
  const jsonStr = JSON.stringify(queue);
  try {
    localStorage.setItem(LS_OFFLINE_QUEUE_KEY, jsonStr);
  } catch {
    // Ignore
  }

  const fullPath = `${INTERNAL_FOLDERS.OFFLINE_QUEUE}/pending_queue.json`;
  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.writeFile({
        path: fullPath,
        data: jsonStr,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
        recursive: true,
      });
    } catch {
      // Ignore
    }
  }
}

export function loadOfflineQueueFromStorage(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(LS_OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
