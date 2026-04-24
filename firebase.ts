import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, browserPopupRedirectResolver, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, enableNetwork } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase SDK
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Test connection and attempt to force online state
async function testConnection() {
  try {
    // Attempt to enable network explicitly if it was disabled or stalled
    await enableNetwork(db);
    // Use getDocFromServer to bypass local cache and verify real cloud connectivity
    // We use a dummy path 'system/ping' - this might fail if rules don't allow it, 
    // but the error message will still tell us if we're online or not.
    await getDocFromServer(doc(db, 'system', 'ping'));
    console.log("[Firebase] Cloud terminal synchronization verified.");
  } catch (error: any) {
    if (error.message?.includes('offline') || error.code === 'unavailable') {
      console.warn("[Firebase] Client is currently offline. Operating in localized mode.");
    } else if (error.code === 'permission-denied') {
      console.log("[Firebase] Cloud terminal reached (Permission verified).");
    } else {
      console.warn("[Firebase] Connection check info:", error.message);
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

// Initialize Auth with explicit settings for iframe compatibility
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});

export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics safely
export const analytics = typeof window !== 'undefined' ? (() => {
  try {
    return getAnalytics(app);
  } catch (e) {
    console.warn("Analytics failed to initialize:", e);
    return null;
  }
})() : null;
