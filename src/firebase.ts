import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// If a specific databaseId was provisioned in firebase-applet-config.json
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Validation probe on initial boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'meta', 'connection_test'));
    console.log('[Firestore] Cloud connection test successful.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Client is offline or Firebase configuration needs attention.');
    } else {
      console.log('[Firestore] Connected to Firebase Cloud Firestore.');
    }
  }
}

export default db;
