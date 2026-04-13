import { create } from 'zustand';
import { signIn, signUp, signOut, AuthUser } from '../services/authService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** true until Firebase reports initial auth state (replaces old hydrate()) */
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  onboardingComplete: boolean;

  // Auth actions
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;

  // Called by the Firebase auth listener in _layout.tsx
  setUser: (user: AuthUser | null) => void;
  setHydrated: () => void;

  // Onboarding
  completeOnboarding: () => Promise<void>;
  setOnboardingComplete: (v: boolean) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isHydrated: false,   // Firebase hasn't reported yet
  isLoading: false,
  error: null,
  onboardingComplete: false,

  // ── Firebase listener callback ──────────────────────────────────────────────
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      // Preserve onboardingComplete if it was already true
      onboardingComplete: user ? get().onboardingComplete : false,
    }),

  setHydrated: () => set({ isHydrated: true }),

  // ── Login ───────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    const { user, error } = await signIn(email, password);
    if (user) {
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return true;
    }
    set({ error, isLoading: false });
    return false;
  },

  // ── Signup ──────────────────────────────────────────────────────────────────
  signup: async (email, password, name) => {
    set({ isLoading: true, error: null });
    const { user, error } = await signUp(email, password, name);
    if (user) {
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return true;
    }
    set({ error, isLoading: false });
    return false;
  },

  // ── Logout ──────────────────────────────────────────────────────────────────
  logout: async () => {
    await signOut();
    set({
      user: null,
      isAuthenticated: false,
      onboardingComplete: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),

  // ── Onboarding ──────────────────────────────────────────────────────────────
  completeOnboarding: async () => {
    set({ onboardingComplete: true });
  },

  setOnboardingComplete: (v) => set({ onboardingComplete: v }),
}));
