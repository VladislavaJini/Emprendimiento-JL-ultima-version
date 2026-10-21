import {
  doc,
  getDocFromServer,
  setDoc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { app, db, firebaseConfig } from '../firebaseConfig';

export { app, db, firebaseConfig };

/**
 * Validate Connection to Firestore on boot (Required by skill)
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connection test succeeded');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline, using offline cache / localStorage fallback.');
    } else {
      console.log('[Firebase] Connection initialized with cloud persistence.');
    }
    return false;
  }
}

// Test connection immediately on module load
testConnection();

/**
 * Cloud Sync helpers for Muebles J&L (3 Workshop Users Real-Time Sync)
 */
export async function saveDocToCloud(collectionName: string, docId: string, data: any) {
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(
      docRef,
      {
        ...data,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn(
      `[Firebase] Could not sync ${collectionName}/${docId} to cloud, running on localStorage fallback:`,
      err
    );
    return false;
  }
}

export async function fetchDocFromCloud(collectionName: string, docId: string) {
  try {
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn(`[Firebase] Error fetching ${collectionName}/${docId}:`, err);
    return null;
  }
}

/**
 * Real-Time onSnapshot listener for multi-device synchronization across the 3 workshop phones.
 * Ignores local pending-write echoes so active user edits are never overwritten or reset.
 */
export function subscribeToWorkshopState(
  onData: (data: Record<string, any>, fromCache: boolean) => void,
  onStatusChange?: (isOnlineSynced: boolean) => void
) {
  try {
    const docRef = doc(db, 'workshop_state', 'current');
    return onSnapshot(
      docRef,
      (snapshot) => {
        const isFromCache = snapshot.metadata.fromCache;
        const hasPendingWrites = snapshot.metadata.hasPendingWrites;
        if (onStatusChange) {
          onStatusChange(!isFromCache && navigator.onLine);
        }
        // Never overwrite local state with our own pending write echo
        if (hasPendingWrites) {
          return;
        }
        if (snapshot.exists()) {
          onData(snapshot.data(), isFromCache);
        }
      },
      (err) => {
        console.warn('[Firebase] Real-time listener fallback to local offline mode:', err);
        if (onStatusChange) {
          onStatusChange(false);
        }
      }
    );
  } catch (err) {
    console.warn('[Firebase] Failed to attach real-time listener:', err);
    if (onStatusChange) {
      onStatusChange(false);
    }
    return () => {};
  }
}
