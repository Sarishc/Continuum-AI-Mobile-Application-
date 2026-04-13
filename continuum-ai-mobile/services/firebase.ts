import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  inMemoryPersistence,
  setPersistence,
  Auth,
} from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAnalytics, Analytics, isSupported, logEvent } from 'firebase/analytics';
import { Platform } from 'react-native';

// ─── Config (from .env) ───────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyCi47367u0upf6U_AvcgdrbCD6eVd-P5ZA',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'continuum-4129a.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'continuum-4129a',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'continuum-4129a.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '521613508911',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:521613508911:web:db6c0bcb1bc8e7732ca1da',
  measurementId: 'G-P3VRPN5TWL',
};

// ─── Initialize app (guard against hot-reload duplicates) ─────────────────────

const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// ─── Auth — with platform-appropriate persistence ─────────────────────────────

let auth: Auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
  // Web: persist session in localStorage across browser refreshes
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} else {
  // Native (Expo Go + JS SDK): in-memory persistence keeps the session alive
  // while the app is running. For production native apps, use @react-native-firebase
  // which provides true AsyncStorage-backed persistence across restarts.
  auth = initializeAuth(app, {
    persistence: inMemoryPersistence,
  });
}

// ─── Firestore ────────────────────────────────────────────────────────────────

const db: Firestore = getFirestore(app);

// Enable offline persistence on web (native has built-in offline support)
if (Platform.OS === 'web') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open — persistence works in one tab
    }
    // 'unimplemented': browser doesn't support it — silently skip
  });
}

// ─── Analytics (web + supported envs only) ────────────────────────────────────

let analytics: Analytics | null = null;

isSupported()
  .then((supported) => {
    if (supported) analytics = getAnalytics(app);
  })
  .catch(() => {});

/**
 * Log a Firebase Analytics event.
 * Safe on all platforms — no-ops when analytics isn't available.
 */
export function firebaseLogEvent(
  name: string,
  params?: Record<string, string | number | boolean>
): void {
  try {
    if (analytics) logEvent(analytics, name, params);
  } catch {
    // Fail silently — analytics must never crash the app
  }
}

export { app, auth, db, analytics };
