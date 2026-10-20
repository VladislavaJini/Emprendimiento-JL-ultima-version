import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

/**
 * Modular Firebase Configuration for Muebles J&L (3 Workshop Users Real-Time Sync)
 * Uses provisioned AI Studio Firebase Applet credentials with clear fallback placeholders.
 */
export const firebaseConfig = {
  apiKey: appletConfig.apiKey || 'AIzaSy_PLACEHOLDER_WORKSHOP_KEY',
  authDomain: appletConfig.authDomain || 'muebles-jl-atelier.firebaseapp.com',
  projectId: appletConfig.projectId || 'muebles-jl-atelier',
  storageBucket: appletConfig.storageBucket || 'muebles-jl-atelier.appspot.com',
  messagingSenderId: appletConfig.messagingSenderId || '000000000000',
  appId: appletConfig.appId || '1:000000000000:web:000000000000',
  firestoreDatabaseId: appletConfig.firestoreDatabaseId || '(default)',
};

// Initialize Firebase App singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore instance
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Enable Offline-First IndexedDB Persistence alongside LocalStorage
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.info('[Firebase] Offline persistence active in primary tab.');
    } else if (err.code === 'unimplemented') {
      console.info('[Firebase] Browser does not support IndexedDB persistence; using localStorage fallback.');
    }
  });
}
