import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERNAL_FOLDERS,
  computeBackupChecksum,
  createBackupPayload,
  validateBackupPayload,
  mergeBackupPayloadSafely,
  enqueueOfflineAction,
  markQueueItemFailed,
  removeQueueItem,
  shouldApplyIncomingRemoteSync,
  parseSemver,
  compareSemver,
  parseGitHubReleaseResponse,
  type PharmacyStateSnapshot,
} from './storageAndSyncLogic.ts';
import type { ShopSettings } from './pharmacyLogic.ts';

const sampleSettings: ShopSettings = {
  shopName: 'Haryana Medical Store',
  tagline: 'Complete Healthcare',
  proprietor: 'Rahul Sharma',
  address: 'Dhoha',
  phone: '9813400001',
  altPhone: '9813400002',
  email: 'rohitsharma22057@gmail.com',
  gstin: '',
  drugLicence: 'HR-NUH-1001',
  lowStockThreshold: 25,
  expiryAlertDays: 60,
  darkMode: false,
  autoBackup: true,
  lastBackupTime: '19/10/2026',
  logoDataUrl: '',
  referenceBillDataUrl: '',
  styleScreenshotDataUrl: '',
  themeColorHex: '#047857',
  onboardingCompleted: true,
  ownerUser: 'rahul',
  ownerPass: '1234',
  ownerPin: '1234',
  staffUser: 'staff',
  staffPass: '0000',
  staffPin: '0000',
  securityQuestion: 'Village?',
  securityAnswer: 'Dhoha',
};

const sampleState: PharmacyStateSnapshot = {
  settings: sampleSettings,
  medicines: [
    {
      id: 'M1',
      name: 'Dolo 650 Tablet',
      salt: 'Paracetamol 650mg',
      manufacturer: 'Micro Labs',
      category: 'Tablet',
      hsn: '30049099',
      gst: 12,
      schedule: 'OTC',
      rack: 'R1-A1',
      reorderLevel: 30,
      stripsPerBox: 10,
      unitsPerStrip: 15,
      lastSoldDate: '2026-10-18',
    },
  ],
  batches: [
    {
      id: 'B1',
      medicineId: 'M1',
      batchNo: 'DL2801',
      expiryDate: '2028-01-31',
      purchaseRate: 22,
      mrp: 33,
      quantity: 90,
      supplierId: 'SUP-1',
      purchaseDate: '2026-10-02',
      barcode: '8901001',
    },
  ],
  suppliers: [
    {
      id: 'SUP-1',
      name: 'Mewat Pharma Distributors',
      gstin: '06AAACM1234A1Z5',
      phone: '9812011223',
      address: 'Nuh',
      openingBalance: 0,
    },
  ],
  customers: [
    {
      id: 'CUST-1',
      name: 'Ramesh Kumar',
      mobile: '9813411111',
      address: 'Dhoha',
      udhaarBalance: 150,
    },
  ],
  purchases: [],
  purchaseReturns: [],
  sales: [],
  saleReturns: [],
  stockMovements: [],
  deletedItems: [],
};

test('INTERNAL_FOLDERS defines dedicated paths for backups, safety snapshots, exports, and offline queue', () => {
  assert.equal(INTERNAL_FOLDERS.BACKUPS, 'HaryanaMedicalStore/backups');
  assert.equal(INTERNAL_FOLDERS.SAFETY_SNAPSHOTS, 'HaryanaMedicalStore/safety_snapshots');
  assert.equal(INTERNAL_FOLDERS.EXPORTS, 'HaryanaMedicalStore/exports');
  assert.equal(INTERNAL_FOLDERS.OFFLINE_QUEUE, 'HaryanaMedicalStore/offline_queue');
});

test('createBackupPayload and validateBackupPayload verify intact backups and reject corrupted ones', () => {
  const backup = createBackupPayload(sampleState, 'INTERNAL_STORAGE', {
    note: 'Unit test backup',
    deviceId: 'DEV-1',
  });

  assert.ok(backup.checksum.startsWith('HMS-CHK-'));
  assert.equal(backup.recordCounts.medicines, 1);
  assert.equal(backup.recordCounts.batches, 1);

  const validResult = validateBackupPayload(backup);
  assert.equal(validResult.valid, true);
  assert.equal(validResult.errors.length, 0);
  assert.equal(validResult.warnings.length, 0);

  // Tamper checksum
  const tampered = { ...backup, checksum: 'HMS-CHK-00000000' };
  const tamperedResult = validateBackupPayload(tampered);
  assert.equal(tamperedResult.valid, true);
  assert.equal(tamperedResult.warnings.length, 1);

  // Invalid non-object or missing collections
  const invalidResult = validateBackupPayload({ foo: 'bar' });
  assert.equal(invalidResult.valid, false);
  assert.ok(invalidResult.errors.length > 0);
});

test('mergeBackupPayloadSafely supports both non-destructive merge and full replace modes', () => {
  const incomingState: PharmacyStateSnapshot = {
    ...sampleState,
    medicines: [
      {
        id: 'M2',
        name: 'Azithral 500 Tablet',
        salt: 'Azithromycin 500mg',
        manufacturer: 'Alembic',
        category: 'Tablet',
        hsn: '30049099',
        gst: 12,
        schedule: 'H',
        rack: 'R1-B2',
        reorderLevel: 20,
        stripsPerBox: 10,
        unitsPerStrip: 5,
        lastSoldDate: '2026-10-19',
      },
    ],
  };
  const incomingPayload = createBackupPayload(incomingState, 'CLOUD_FIRESTORE');

  const merged = mergeBackupPayloadSafely(sampleState, incomingPayload, 'merge');
  assert.equal(merged.medicines.length, 2); // Both M1 and M2 preserved

  const replaced = mergeBackupPayloadSafely(sampleState, incomingPayload, 'replace');
  assert.equal(replaced.medicines.length, 1);
  assert.equal(replaced.medicines[0].id, 'M2');
});

test('Offline sync queue coalesces LIVE_SYNC items and tracks retries/removals', () => {
  let queue = enqueueOfflineAction([], {
    actionType: 'LIVE_SYNC',
    summary: 'Sync #1',
    payload: sampleState,
    nowIso: '2026-10-19T10:00:00Z',
  });
  assert.equal(queue.length, 1);

  // Second LIVE_SYNC should coalesce into the existing pending LIVE_SYNC item
  queue = enqueueOfflineAction(queue, {
    actionType: 'LIVE_SYNC',
    summary: 'Sync #2 (Coalesced)',
    payload: sampleState,
    nowIso: '2026-10-19T10:01:00Z',
  });
  assert.equal(queue.length, 1);
  assert.equal(queue[0].summary, 'Sync #2 (Coalesced)');

  // Distinct CLOUD_BACKUP action should append as a separate item
  queue = enqueueOfflineAction(queue, {
    actionType: 'CLOUD_BACKUP',
    summary: 'Manual Cloud Backup',
    payload: sampleState,
    nowIso: '2026-10-19T10:02:00Z',
  });
  assert.equal(queue.length, 2);

  // Mark first item failed
  const firstId = queue[0].id;
  queue = markQueueItemFailed(queue, firstId, 'Network timeout');
  assert.equal(queue[0].status, 'FAILED');
  assert.equal(queue[0].retryCount, 1);
  assert.equal(queue[0].lastError, 'Network timeout');

  // Remove first item after successful flush
  queue = removeQueueItem(queue, firstId);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].actionType, 'CLOUD_BACKUP');
});

test('shouldApplyIncomingRemoteSync blocks self-echoes and stale revisions', () => {
  const localMeta = {
    deviceId: 'POS-TERMINAL-1',
    lastSyncTimestamp: 1700000000000,
    revision: 5,
  };

  // Same deviceId -> must ignore to prevent infinite loop
  assert.equal(
    shouldApplyIncomingRemoteSync(localMeta, {
      deviceId: 'POS-TERMINAL-1',
      lastSyncTimestamp: 1700000099999,
      revision: 6,
    }),
    false
  );

  // Older timestamp from another device -> ignore
  assert.equal(
    shouldApplyIncomingRemoteSync(localMeta, {
      deviceId: 'POS-TERMINAL-2',
      lastSyncTimestamp: 1699999999000,
      revision: 10,
    }),
    false
  );

  // Newer timestamp from another device -> apply
  assert.equal(
    shouldApplyIncomingRemoteSync(localMeta, {
      deviceId: 'POS-TERMINAL-2',
      lastSyncTimestamp: 1700000005000,
      revision: 6,
    }),
    true
  );
});

test('parseSemver, compareSemver, and parseGitHubReleaseResponse handle GitHub APK releases accurately', () => {
  assert.deepEqual(parseSemver('v2.8.0'), [2, 8, 0]);
  assert.deepEqual(parseSemver('1.0.42'), [1, 0, 42]);
  assert.equal(compareSemver('2.9.0', '2.8.0'), 1);
  assert.equal(compareSemver('2.8.0', '2.8.0'), 0);
  assert.equal(compareSemver('2.7.5', '2.8.0'), -1);

  const mockGitHubRelease = {
    tag_name: 'v2.9.1',
    name: 'Release v2.9.1 — Pharmacy Sync & Internal Storage Update',
    published_at: '2026-10-19T12:00:00Z',
    body: '- Added Internal Storage Folder\n- Added Firebase Real-Time Sync',
    html_url: 'https://github.com/rohitsharma22057/haryana-medical-store/releases/tag/v2.9.1',
    assets: [
      {
        name: 'app-debug.apk',
        browser_download_url:
          'https://github.com/rohitsharma22057/haryana-medical-store/releases/download/v2.9.1/app-debug.apk',
        size: 4123456,
        content_type: 'application/vnd.android.package-archive',
      },
    ],
  };

  const parsed = parseGitHubReleaseResponse(
    mockGitHubRelease,
    '2.8.0',
    'rohitsharma22057/haryana-medical-store'
  );
  assert.equal(parsed.hasUpdate, true);
  assert.equal(parsed.status, 'update-available');
  assert.equal(parsed.latestVersion, '2.9.1');
  assert.equal(parsed.apkAsset?.name, 'app-debug.apk');
  assert.equal(parsed.apkAsset?.sizeBytes, 4123456);
});
