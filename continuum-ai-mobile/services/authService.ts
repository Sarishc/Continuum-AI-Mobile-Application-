import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  isEmailVerified: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toAuthUser(firebaseUser: FirebaseUser): AuthUser {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    name: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
    createdAt: firebaseUser.metadata.creationTime ?? new Date().toISOString(),
    isEmailVerified: firebaseUser.emailVerified,
  };
}

function generateReferralCode(name: string): string {
  const prefix = name.toUpperCase().replace(/\s/g, '').slice(0, 6);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

function getAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/invalid-credential': 'Invalid email or password.',
  };
  return messages[code] ?? 'Something went wrong. Please try again.';
}

// ─── Sign up ──────────────────────────────────────────────────────────────────

export async function signUp(
  email: string,
  password: string,
  name: string,
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    // Set display name so toAuthUser works immediately
    await updateProfile(credential.user, { displayName: name });

    // Create user doc in Firestore
    await setDoc(doc(db, 'users', credential.user.uid), {
      id: credential.user.uid,
      email,
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      onboardingComplete: false,
      referralCode: generateReferralCode(name),
    });

    // Create empty health profile
    await setDoc(doc(db, 'healthProfiles', credential.user.uid), {
      userId: credential.user.uid,
      conditions: [],
      medications: [],
      allergies: [],
      age: null,
      sex: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { user: toAuthUser(credential.user), error: null };
  } catch (err: any) {
    return { user: null, error: getAuthErrorMessage(err.code) };
  }
}

// ─── Sign in ──────────────────────────────────────────────────────────────────

export async function signIn(
  email: string,
  password: string,
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { user: toAuthUser(credential.user), error: null };
  } catch (err: any) {
    return { user: null, error: getAuthErrorMessage(err.code) };
  }
}

// ─── Sign out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function resetPassword(
  email: string,
): Promise<{ error: string | null }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (err: any) {
    return { error: getAuthErrorMessage(err.code) };
  }
}

// ─── Fetch Firestore user doc ─────────────────────────────────────────────────

export async function getUserData(uid: string): Promise<AuthUser | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: uid,
      email: data.email ?? '',
      name: data.name ?? 'User',
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      isEmailVerified: auth.currentUser?.emailVerified ?? false,
    };
  } catch {
    return null;
  }
}

// ─── Auth state listener ──────────────────────────────────────────────────────

export function onAuthStateChange(
  callback: (user: AuthUser | null) => void,
): () => void {
  return onAuthStateChanged(auth, (firebaseUser) => {
    callback(firebaseUser ? toAuthUser(firebaseUser) : null);
  });
}
