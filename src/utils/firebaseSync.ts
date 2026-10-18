import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

export async function syncCloudBackup(shopData: {
  settings: any;
  medicines: any;
  batches: any;
  suppliers: any;
  customers: any;
  sales: any;
  purchases: any;
}) {
  try {
    const docRef = doc(db, 'haryana_medical_store', 'cloud_backup_v1');
    await setDoc(docRef, {
      ...shopData,
      lastCloudSync: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error('Cloud sync backup failed:', err);
    return false;
  }
}

export async function restoreCloudBackup() {
  try {
    const docRef = doc(db, 'haryana_medical_store', 'cloud_backup_v1');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data();
    }
    return null;
  } catch (err) {
    console.error('Cloud restore failed:', err);
    return null;
  }
}
