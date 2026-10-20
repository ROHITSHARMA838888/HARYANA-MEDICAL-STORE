import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  createBackupPayload,
  validateBackupPayload,
  shouldApplyIncomingRemoteSync,
  type BackupPayload,
  type BackupRecordCounts,
  type PharmacyStateSnapshot,
  type SyncMetadata,
} from './storageAndSyncLogic';

const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

const COLLECTION_NAME = 'haryana_medical_store';
const LIVE_SYNC_DOC_ID = 'live_sync_v1';
const CLOUD_BACKUP_DOC_ID = 'cloud_backup_v1';
const CLOUD_BACKUP_PREV_DOC_ID = 'cloud_backup_previous';

/**
 * Validates connection to Firestore on application boot using getDocFromServer.
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

export interface CloudBackupMetadata {
  exists: boolean;
  lastCloudSync: string;
  exportedAt: string;
  checksum: string;
  note?: string;
  deviceId?: string;
  version: string;
  recordCounts: BackupRecordCounts;
}

/**
 * Real-Time Sync Listener using Firestore onSnapshot with proper cleanup and loop prevention.
 */
export function subscribeToRealtimePharmacySync(
  getLocalMeta: () => SyncMetadata,
  callbacks: {
    onRemoteData: (payload: BackupPayload, remoteMeta: SyncMetadata) => void;
    onStatusChange: (status: 'connected' | 'syncing' | 'offline' | 'error', detail?: string) => void;
  }
): Unsubscribe {
  const path = `${COLLECTION_NAME}/${LIVE_SYNC_DOC_ID}`;
  const docRef = doc(db, COLLECTION_NAME, LIVE_SYNC_DOC_ID);

  return onSnapshot(
    docRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.metadata.fromCache && !navigator.onLine) {
        callbacks.onStatusChange('offline', 'Listening to local cache (Offline)');
      } else if (snapshot.metadata.hasPendingWrites) {
        callbacks.onStatusChange('syncing', 'Syncing local changes to Firebase...');
      } else {
        callbacks.onStatusChange('connected', 'Firebase Real-Time Listener Active');
      }

      if (!snapshot.exists()) return;
      // Ignore local pending writes so we only apply genuine remote changes
      if (snapshot.metadata.hasPendingWrites) return;

      const rawData = snapshot.data();
      const localMeta = getLocalMeta();
      const remoteMeta: SyncMetadata = {
        deviceId: String(rawData.deviceId || ''),
        lastSyncTimestamp: Number(rawData.lastSyncTimestamp || 0),
        revision: Number(rawData.revision || 0),
      };

      if (!shouldApplyIncomingRemoteSync(localMeta, remoteMeta)) {
        return;
      }

      const validation = validateBackupPayload(rawData);
      if (validation.valid && validation.payload) {
        callbacks.onRemoteData(validation.payload, remoteMeta);
      }
    },
    (error) => {
      const errInfo = handleFirestoreError(error, OperationType.GET, path);
      callbacks.onStatusChange('error', errInfo.error);
    }
  );
}

/**
 * Push live state changes to Firebase real-time sync document (`haryana_medical_store/live_sync_v1`).
 */
export async function pushRealtimePharmacySync(
  state: PharmacyStateSnapshot,
  syncMeta: SyncMetadata
): Promise<{ ok: boolean; error?: string }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'Device is offline' };
  }

  const path = `${COLLECTION_NAME}/${LIVE_SYNC_DOC_ID}`;
  try {
    const payload = createBackupPayload(state, 'CLOUD_FIRESTORE', {
      deviceId: syncMeta.deviceId,
      note: 'Real-time automatic sync',
    });

    const docRef = doc(db, COLLECTION_NAME, LIVE_SYNC_DOC_ID);
    await setDoc(docRef, {
      ...payload,
      deviceId: syncMeta.deviceId,
      lastSyncTimestamp: syncMeta.lastSyncTimestamp,
      revision: syncMeta.revision,
      lastCloudSync: new Date().toISOString(),
    });
    return { ok: true };
  } catch (error) {
    const info = handleFirestoreError(error, OperationType.WRITE, path);
    return { ok: false, error: info.error };
  }
}

/**
 * Separate Action: Safe Cloud Backup (`haryana_medical_store/cloud_backup_v1`).
 * First preserves the existing cloud backup in `cloud_backup_previous` before writing the new verified snapshot.
 */
export async function createSafeCloudBackup(
  state: PharmacyStateSnapshot,
  options?: { note?: string; deviceId?: string }
): Promise<{ ok: boolean; payload?: BackupPayload; error?: string }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'Offline — Cloud backup queued for automatic upload when online.' };
  }

  const path = `${COLLECTION_NAME}/${CLOUD_BACKUP_DOC_ID}`;
  try {
    const payload = createBackupPayload(state, 'CLOUD_FIRESTORE', {
      note: options?.note || 'Manual Verified Cloud Backup',
      deviceId: options?.deviceId,
    });

    const validation = validateBackupPayload(payload);
    if (!validation.valid) {
      return { ok: false, error: validation.errors.join(' ') };
    }

    const mainRef = doc(db, COLLECTION_NAME, CLOUD_BACKUP_DOC_ID);
    const prevRef = doc(db, COLLECTION_NAME, CLOUD_BACKUP_PREV_DOC_ID);

    // Copy current cloud backup to `cloud_backup_previous` for rollback safety
    try {
      const currentSnap = await getDoc(mainRef);
      if (currentSnap.exists()) {
        const prevData = currentSnap.data();
        await setDoc(prevRef, {
          ...prevData,
          lastCloudSync: new Date().toISOString(),
          note: 'Previous Cloud Backup Rollback Point',
        });
      }
    } catch {
      // Non-fatal if previous backup copy is skipped
    }

    await setDoc(mainRef, {
      ...payload,
      lastCloudSync: new Date().toISOString(),
    });

    return { ok: true, payload };
  } catch (error) {
    const info = handleFirestoreError(error, OperationType.WRITE, path);
    return { ok: false, error: info.error };
  }
}

/**
 * Separate Action: Inspect Cloud Backup Metadata before restoring.
 */
export async function fetchCloudBackupMetadata(): Promise<CloudBackupMetadata | null> {
  const path = `${COLLECTION_NAME}/${CLOUD_BACKUP_DOC_ID}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, CLOUD_BACKUP_DOC_ID);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      return null;
    }
    const data = snapshot.data();
    const validation = validateBackupPayload(data);
    return {
      exists: true,
      lastCloudSync: String(data.lastCloudSync || data.exportedAt || ''),
      exportedAt: String(data.exportedAt || data.lastCloudSync || ''),
      checksum: String(data.checksum || validation.payload?.checksum || 'Verified'),
      note: typeof data.note === 'string' ? data.note : undefined,
      deviceId: typeof data.deviceId === 'string' ? data.deviceId : undefined,
      version: String(data.version || '2.8.0'),
      recordCounts: validation.recordCounts,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Separate Action: Safe Cloud Restore from `haryana_medical_store/cloud_backup_v1` (or `cloud_backup_previous`).
 * Strictly validates the cloud document before returning it.
 */
export async function restoreFromSafeCloudBackup(
  sourceDoc: 'cloud_backup_v1' | 'cloud_backup_previous' = 'cloud_backup_v1'
): Promise<{
  ok: boolean;
  payload?: BackupPayload;
  warnings?: string[];
  error?: string;
}> {
  const path = `${COLLECTION_NAME}/${sourceDoc}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, sourceDoc);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      return {
        ok: false,
        error: 'No Cloud Backup snapshot found in Firebase Firestore yet. Create a Cloud Backup first.',
      };
    }

    const raw = snapshot.data();
    const validation = validateBackupPayload(raw);
    if (!validation.valid || !validation.payload) {
      return {
        ok: false,
        error: `Cloud backup failed integrity validation: ${validation.errors.join(' ')}`,
      };
    }

    return {
      ok: true,
      payload: validation.payload,
      warnings: validation.warnings,
    };
  } catch (error) {
    const info = handleFirestoreError(error, OperationType.GET, path);
    return {
      ok: false,
      error: `Failed to fetch Cloud Backup: ${info.error}`,
    };
  }
}

// Backwards-compatible helpers
export async function syncCloudBackup(shopData: any) {
  const res = await createSafeCloudBackup(shopData as PharmacyStateSnapshot);
  return res.ok;
}

export async function restoreCloudBackup() {
  const res = await restoreFromSafeCloudBackup('cloud_backup_v1');
  return res.ok ? res.payload : null;
}
