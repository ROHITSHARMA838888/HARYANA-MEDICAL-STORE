import type {
  ShopSettings,
  Medicine,
  Batch,
  Supplier,
  Customer,
  PurchaseRecord,
  PurchaseReturnRecord,
  SaleRecord,
  SaleReturnRecord,
  StockMovement,
  DeletedItemRecord,
} from './pharmacyLogic';

export const INTERNAL_STORAGE_ROOT = 'HaryanaMedicalStore';

export const INTERNAL_FOLDERS = {
  BACKUPS: `${INTERNAL_STORAGE_ROOT}/backups`,
  SAFETY_SNAPSHOTS: `${INTERNAL_STORAGE_ROOT}/safety_snapshots`,
  EXPORTS: `${INTERNAL_STORAGE_ROOT}/exports`,
  OFFLINE_QUEUE: `${INTERNAL_STORAGE_ROOT}/offline_queue`,
} as const;

export const APP_CURRENT_VERSION = '2.8.0';
export const DEFAULT_GITHUB_REPO = 'rohitsharma22057/haryana-medical-store';

export interface PharmacyStateSnapshot {
  settings: ShopSettings;
  medicines: Medicine[];
  batches: Batch[];
  suppliers: Supplier[];
  customers: Customer[];
  purchases: PurchaseRecord[];
  purchaseReturns: PurchaseReturnRecord[];
  sales: SaleRecord[];
  saleReturns: SaleReturnRecord[];
  stockMovements: StockMovement[];
  deletedItems: DeletedItemRecord[];
}

export interface BackupRecordCounts {
  medicines: number;
  batches: number;
  suppliers: number;
  customers: number;
  purchases: number;
  purchaseReturns: number;
  sales: number;
  saleReturns: number;
  stockMovements: number;
  deletedItems: number;
}

export type BackupSourceType =
  | 'INTERNAL_STORAGE'
  | 'SAFETY_SNAPSHOT'
  | 'CLOUD_FIRESTORE'
  | 'EXTERNAL_JSON';

export interface BackupPayload extends PharmacyStateSnapshot {
  version: string;
  exportedAt: string;
  lastCloudSync: string;
  shopId: string;
  source: BackupSourceType;
  checksum: string;
  note?: string;
  deviceId?: string;
  recordCounts: BackupRecordCounts;
}

export interface BackupValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  payload: BackupPayload | null;
  recordCounts: BackupRecordCounts;
}

export type OfflineActionType =
  | 'LIVE_SYNC'
  | 'CLOUD_BACKUP'
  | 'SALE_CREATED'
  | 'PURCHASE_CREATED'
  | 'INVENTORY_UPDATED'
  | 'SETTINGS_UPDATED';

export interface OfflineQueueItem {
  id: string;
  actionType: OfflineActionType;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  status: 'PENDING' | 'PROCESSING' | 'FAILED';
  lastError?: string;
  summary: string;
  payload: PharmacyStateSnapshot;
}

export interface SyncMetadata {
  deviceId: string;
  lastSyncTimestamp: number;
  revision: number;
}

export interface GitHubReleaseAssetInfo {
  name: string;
  downloadUrl: string;
  sizeBytes: number;
  contentType: string;
}

export interface GitHubReleaseCheckResult {
  checkedAt: string;
  repoSlug: string;
  currentVersion: string;
  latestVersion: string;
  tagName: string;
  releaseName: string;
  publishedAt: string;
  releaseNotes: string;
  htmlUrl: string;
  hasUpdate: boolean;
  apkAsset: GitHubReleaseAssetInfo | null;
  status: 'update-available' | 'up-to-date' | 'fallback-local-apk' | 'offline-error';
  message: string;
}

export function computeRecordCounts(state: Partial<PharmacyStateSnapshot>): BackupRecordCounts {
  return {
    medicines: Array.isArray(state.medicines) ? state.medicines.length : 0,
    batches: Array.isArray(state.batches) ? state.batches.length : 0,
    suppliers: Array.isArray(state.suppliers) ? state.suppliers.length : 0,
    customers: Array.isArray(state.customers) ? state.customers.length : 0,
    purchases: Array.isArray(state.purchases) ? state.purchases.length : 0,
    purchaseReturns: Array.isArray(state.purchaseReturns) ? state.purchaseReturns.length : 0,
    sales: Array.isArray(state.sales) ? state.sales.length : 0,
    saleReturns: Array.isArray(state.saleReturns) ? state.saleReturns.length : 0,
    stockMovements: Array.isArray(state.stockMovements) ? state.stockMovements.length : 0,
    deletedItems: Array.isArray(state.deletedItems) ? state.deletedItems.length : 0,
  };
}

export function computeBackupChecksum(state: Partial<PharmacyStateSnapshot>): string {
  const counts = computeRecordCounts(state);
  const firstMed = state.medicines?.[0]?.id || 'none';
  const lastSale = state.sales?.[0]?.id || 'none';
  const totalStock = (state.batches || []).reduce((acc, b) => acc + Number(b?.quantity || 0), 0);
  const raw = `HMS|M:${counts.medicines}|B:${counts.batches}|S:${counts.suppliers}|C:${counts.customers}|P:${counts.purchases}|SL:${counts.sales}|D:${counts.deletedItems}|STK:${totalStock}|${firstMed}|${lastSale}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `HMS-CHK-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

export function createBackupPayload(
  state: PharmacyStateSnapshot,
  source: BackupSourceType = 'INTERNAL_STORAGE',
  options?: { note?: string; deviceId?: string; exportedAt?: string }
): BackupPayload {
  const nowIso = options?.exportedAt || new Date().toISOString();
  const recordCounts = computeRecordCounts(state);
  const checksum = computeBackupChecksum(state);

  return {
    version: APP_CURRENT_VERSION,
    exportedAt: nowIso,
    lastCloudSync: nowIso,
    shopId: 'haryana_medical_store_dhoha',
    source,
    checksum,
    ...(options?.note ? { note: options.note.slice(0, 240) } : {}),
    ...(options?.deviceId ? { deviceId: options.deviceId.slice(0, 120) } : {}),
    recordCounts,
    settings: state.settings,
    medicines: state.medicines || [],
    batches: state.batches || [],
    suppliers: state.suppliers || [],
    customers: state.customers || [],
    purchases: state.purchases || [],
    purchaseReturns: state.purchaseReturns || [],
    sales: state.sales || [],
    saleReturns: state.saleReturns || [],
    stockMovements: state.stockMovements || [],
    deletedItems: state.deletedItems || [],
  };
}

export function validateBackupPayload(raw: unknown): BackupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      valid: false,
      errors: ['Backup data must be a valid JSON object.'],
      warnings: [],
      payload: null,
      recordCounts: computeRecordCounts({}),
    };
  }

  const obj = raw as Record<string, any>;

  const hasAnyCoreCollection =
    Array.isArray(obj.medicines) ||
    Array.isArray(obj.batches) ||
    Array.isArray(obj.suppliers) ||
    Array.isArray(obj.customers) ||
    Array.isArray(obj.sales) ||
    Array.isArray(obj.purchases);

  if (!hasAnyCoreCollection) {
    errors.push(
      'Backup is missing core pharmacy collections (medicines, batches, suppliers, customers, or sales).'
    );
  }

  const arrayFields = [
    'medicines',
    'batches',
    'suppliers',
    'customers',
    'purchases',
    'purchaseReturns',
    'sales',
    'saleReturns',
    'stockMovements',
    'deletedItems',
  ] as const;

  for (const field of arrayFields) {
    if (obj[field] !== undefined && !Array.isArray(obj[field])) {
      errors.push(`Field "${field}" must be an array.`);
    }
  }

  if (obj.settings !== undefined && (typeof obj.settings !== 'object' || Array.isArray(obj.settings))) {
    errors.push('Field "settings" must be an object.');
  }

  if (Array.isArray(obj.medicines) && obj.medicines.length > 0) {
    const invalidMed = obj.medicines.some((m: any) => !m || typeof m.id !== 'string' || typeof m.name !== 'string');
    if (invalidMed) {
      errors.push('One or more medicine records are missing required "id" or "name" strings.');
    }
  }

  if (Array.isArray(obj.batches) && obj.batches.length > 0) {
    const invalidBatch = obj.batches.some(
      (b: any) => !b || typeof b.id !== 'string' || typeof b.medicineId !== 'string'
    );
    if (invalidBatch) {
      errors.push('One or more batch records are missing required "id" or "medicineId" strings.');
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      payload: null,
      recordCounts: computeRecordCounts(obj),
    };
  }

  const normalizedState: PharmacyStateSnapshot = {
    settings: (obj.settings || {}) as ShopSettings,
    medicines: Array.isArray(obj.medicines) ? obj.medicines : [],
    batches: Array.isArray(obj.batches) ? obj.batches : [],
    suppliers: Array.isArray(obj.suppliers) ? obj.suppliers : [],
    customers: Array.isArray(obj.customers) ? obj.customers : [],
    purchases: Array.isArray(obj.purchases) ? obj.purchases : [],
    purchaseReturns: Array.isArray(obj.purchaseReturns) ? obj.purchaseReturns : [],
    sales: Array.isArray(obj.sales) ? obj.sales : [],
    saleReturns: Array.isArray(obj.saleReturns) ? obj.saleReturns : [],
    stockMovements: Array.isArray(obj.stockMovements) ? obj.stockMovements : [],
    deletedItems: Array.isArray(obj.deletedItems) ? obj.deletedItems : [],
  };

  const computedChecksum = computeBackupChecksum(normalizedState);
  if (obj.checksum && typeof obj.checksum === 'string' && obj.checksum !== computedChecksum) {
    warnings.push(
      `Checksum mismatch (expected ${obj.checksum}, computed ${computedChecksum}). Backup may have been edited manually.`
    );
  }

  const recordCounts = computeRecordCounts(normalizedState);
  if (recordCounts.medicines === 0 && recordCounts.batches === 0 && recordCounts.sales === 0) {
    warnings.push('Backup contains 0 medicines, 0 batches, and 0 sales.');
  }

  const payload: BackupPayload = {
    ...normalizedState,
    version: typeof obj.version === 'string' ? obj.version : APP_CURRENT_VERSION,
    exportedAt:
      typeof obj.exportedAt === 'string'
        ? obj.exportedAt
        : typeof obj.lastCloudSync === 'string'
          ? obj.lastCloudSync
          : new Date().toISOString(),
    lastCloudSync:
      typeof obj.lastCloudSync === 'string'
        ? obj.lastCloudSync
        : typeof obj.exportedAt === 'string'
          ? obj.exportedAt
          : new Date().toISOString(),
    shopId: typeof obj.shopId === 'string' ? obj.shopId : 'haryana_medical_store_dhoha',
    source: (obj.source as BackupSourceType) || 'EXTERNAL_JSON',
    checksum: computedChecksum,
    note: typeof obj.note === 'string' ? obj.note : undefined,
    deviceId: typeof obj.deviceId === 'string' ? obj.deviceId : undefined,
    recordCounts,
  };

  return {
    valid: true,
    errors: [],
    warnings,
    payload,
    recordCounts,
  };
}

function mergeArrayById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of current) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }
  for (const item of incoming) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

export function mergeBackupPayloadSafely(
  currentState: PharmacyStateSnapshot,
  incomingPayload: BackupPayload,
  mode: 'replace' | 'merge' = 'merge'
): PharmacyStateSnapshot {
  const mergedSettings: ShopSettings =
    incomingPayload.settings && Object.keys(incomingPayload.settings).length > 0
      ? { ...currentState.settings, ...incomingPayload.settings }
      : currentState.settings;

  if (mode === 'replace') {
    return {
      settings: mergedSettings,
      medicines: incomingPayload.medicines || [],
      batches: incomingPayload.batches || [],
      suppliers: incomingPayload.suppliers || [],
      customers: incomingPayload.customers || [],
      purchases: incomingPayload.purchases || [],
      purchaseReturns: incomingPayload.purchaseReturns ?? currentState.purchaseReturns,
      sales: incomingPayload.sales || [],
      saleReturns: incomingPayload.saleReturns ?? currentState.saleReturns,
      stockMovements: incomingPayload.stockMovements ?? currentState.stockMovements,
      deletedItems: incomingPayload.deletedItems ?? currentState.deletedItems,
    };
  }

  return {
    settings: mergedSettings,
    medicines: mergeArrayById(currentState.medicines, incomingPayload.medicines || []),
    batches: mergeArrayById(currentState.batches, incomingPayload.batches || []),
    suppliers: mergeArrayById(currentState.suppliers, incomingPayload.suppliers || []),
    customers: mergeArrayById(currentState.customers, incomingPayload.customers || []),
    purchases: mergeArrayById(currentState.purchases, incomingPayload.purchases || []),
    purchaseReturns: mergeArrayById(
      currentState.purchaseReturns,
      incomingPayload.purchaseReturns || []
    ),
    sales: mergeArrayById(currentState.sales, incomingPayload.sales || []),
    saleReturns: mergeArrayById(currentState.saleReturns, incomingPayload.saleReturns || []),
    stockMovements: mergeArrayById(
      currentState.stockMovements,
      incomingPayload.stockMovements || []
    ),
    deletedItems: mergeArrayById(currentState.deletedItems, incomingPayload.deletedItems || []),
  };
}

export function enqueueOfflineAction(
  queue: OfflineQueueItem[],
  newItem: {
    actionType: OfflineActionType;
    summary: string;
    payload: PharmacyStateSnapshot;
    nowIso?: string;
  }
): OfflineQueueItem[] {
  const timestamp = newItem.nowIso || new Date().toISOString();
  const nextQueue = [...queue];

  // Coalesce pending LIVE_SYNC items so rapid state updates don't bloat the offline queue
  if (newItem.actionType === 'LIVE_SYNC') {
    const existingIdx = nextQueue.findIndex(
      (q) => q.actionType === 'LIVE_SYNC' && q.status === 'PENDING'
    );
    if (existingIdx >= 0) {
      nextQueue[existingIdx] = {
        ...nextQueue[existingIdx],
        updatedAt: timestamp,
        summary: newItem.summary,
        payload: newItem.payload,
      };
      return nextQueue;
    }
  }

  const created: OfflineQueueItem = {
    id: `OQ-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    actionType: newItem.actionType,
    createdAt: timestamp,
    updatedAt: timestamp,
    retryCount: 0,
    status: 'PENDING',
    summary: newItem.summary,
    payload: newItem.payload,
  };

  // Cap queue at 25 items max to preserve storage speed
  return [...nextQueue, created].slice(-25);
}

export function markQueueItemFailed(
  queue: OfflineQueueItem[],
  id: string,
  errorMsg: string,
  nowIso?: string
): OfflineQueueItem[] {
  const timestamp = nowIso || new Date().toISOString();
  return queue.map((item) =>
    item.id === id
      ? {
          ...item,
          status: 'FAILED',
          retryCount: item.retryCount + 1,
          updatedAt: timestamp,
          lastError: errorMsg,
        }
      : item
  );
}

export function removeQueueItem(queue: OfflineQueueItem[], id: string): OfflineQueueItem[] {
  return queue.filter((item) => item.id !== id);
}

export function shouldApplyIncomingRemoteSync(
  localMeta: SyncMetadata,
  remoteMeta: Partial<SyncMetadata> | null | undefined
): boolean {
  if (!remoteMeta) return false;
  // Never echo our own device's write back into local state
  if (remoteMeta.deviceId && remoteMeta.deviceId === localMeta.deviceId) {
    return false;
  }
  const remoteTs = Number(remoteMeta.lastSyncTimestamp || 0);
  const remoteRev = Number(remoteMeta.revision || 0);
  if (remoteTs > localMeta.lastSyncTimestamp) {
    return true;
  }
  if (remoteTs === localMeta.lastSyncTimestamp && remoteRev > localMeta.revision) {
    return true;
  }
  return false;
}

export function parseSemver(versionStr: string | undefined | null): [number, number, number] {
  if (!versionStr) return [0, 0, 0];
  const cleaned = String(versionStr).trim().replace(/^v/i, '');
  const match = cleaned.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return [0, 0, 0];
  return [
    parseInt(match[1] || '0', 10),
    parseInt(match[2] || '0', 10),
    parseInt(match[3] || '0', 10),
  ];
}

export function compareSemver(vA: string, vB: string): -1 | 0 | 1 {
  const [majA, minA, patA] = parseSemver(vA);
  const [majB, minB, patB] = parseSemver(vB);
  if (majA !== majB) return majA > majB ? 1 : -1;
  if (minA !== minB) return minA > minB ? 1 : -1;
  if (patA !== patB) return patA > patB ? 1 : -1;
  return 0;
}

export function parseGitHubReleaseResponse(
  rawRelease: any,
  currentVersion: string = APP_CURRENT_VERSION,
  repoSlug: string = DEFAULT_GITHUB_REPO
): GitHubReleaseCheckResult {
  const nowIso = new Date().toISOString();
  if (!rawRelease || typeof rawRelease !== 'object') {
    return {
      checkedAt: nowIso,
      repoSlug,
      currentVersion,
      latestVersion: currentVersion,
      tagName: `v${currentVersion}`,
      releaseName: `Haryana Medical Store v${currentVersion}`,
      publishedAt: nowIso,
      releaseNotes: 'Using embedded signed release APK package.',
      htmlUrl: `https://github.com/${repoSlug}/releases`,
      hasUpdate: false,
      apkAsset: {
        name: 'HaryanaMedicalStore-Release.apk',
        downloadUrl: '/haryana-medical-store-release.apk',
        sizeBytes: 3565158,
        contentType: 'application/vnd.android.package-archive',
      },
      status: 'fallback-local-apk',
      message: 'No remote GitHub release object returned; local signed APK ready.',
    };
  }

  const tagName = String(rawRelease.tag_name || rawRelease.name || `v${currentVersion}`).trim();
  const latestVersion = tagName.replace(/^v/i, '');
  const releaseName = String(rawRelease.name || tagName);
  const publishedAt = String(rawRelease.published_at || rawRelease.created_at || nowIso);
  const releaseNotes = String(
    rawRelease.body ||
      'Latest Haryana Medical Store Android APK build with offline POS, internal storage backup, and Firebase sync.'
  ).trim();
  const htmlUrl = String(rawRelease.html_url || `https://github.com/${repoSlug}/releases`);

  const assets = Array.isArray(rawRelease.assets) ? rawRelease.assets : [];
  const rawApk = assets.find(
    (a: any) =>
      a &&
      typeof a.name === 'string' &&
      (a.name.toLowerCase().endsWith('.apk') ||
        a.content_type === 'application/vnd.android.package-archive')
  );

  const apkAsset: GitHubReleaseAssetInfo = rawApk
    ? {
        name: String(rawApk.name),
        downloadUrl: String(rawApk.browser_download_url || '/haryana-medical-store-release.apk'),
        sizeBytes: Number(rawApk.size || 3565158),
        contentType: String(rawApk.content_type || 'application/vnd.android.package-archive'),
      }
    : {
        name: 'HaryanaMedicalStore-Release.apk',
        downloadUrl: '/haryana-medical-store-release.apk',
        sizeBytes: 3565158,
        contentType: 'application/vnd.android.package-archive',
      };

  const cmp = compareSemver(latestVersion, currentVersion);
  // Also detect update if tag is a CI build tag like v1.0.XX that differs from currentVersion and has an APK asset
  const hasUpdate = cmp > 0 || (Boolean(rawApk) && tagName !== `v${currentVersion}` && cmp !== 0);

  return {
    checkedAt: nowIso,
    repoSlug,
    currentVersion,
    latestVersion,
    tagName,
    releaseName,
    publishedAt,
    releaseNotes,
    htmlUrl,
    hasUpdate,
    apkAsset,
    status: hasUpdate ? 'update-available' : 'up-to-date',
    message: hasUpdate
      ? `New GitHub release ${tagName} (${apkAsset.name}) is ready to download.`
      : `App is up to date (${tagName}). Signed APK is available for reinstall/share.`,
  };
}
