import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types';

const SECURE_KEY_TOKEN = 'continuum_access_token';
const SECURE_KEY_REFRESH = 'continuum_refresh_token';
const SECURE_KEY_USER = 'continuum_user';
const SECURE_KEY_ONBOARDING = 'onboarding_complete';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  onboardingComplete: boolean;

  login: (accessToken: string, user: User, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  hydrate: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isHydrated: false,
  onboardingComplete: false,

  login: async (accessToken, user, refreshToken) => {
    await SecureStore.setItemAsync(SECURE_KEY_TOKEN, accessToken);
    await SecureStore.setItemAsync(SECURE_KEY_USER, JSON.stringify(user));
    if (refreshToken) {
      await SecureStore.setItemAsync(SECURE_KEY_REFRESH, refreshToken);
    }
    set({ accessToken, refreshToken: refreshToken ?? null, user, isAuthenticated: true });
  },

  setTokens: async (accessToken, refreshToken) => {
    await SecureStore.setItemAsync(SECURE_KEY_TOKEN, accessToken);
    await SecureStore.setItemAsync(SECURE_KEY_REFRESH, refreshToken);
    set({ accessToken, refreshToken });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(SECURE_KEY_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_KEY_REFRESH);
    await SecureStore.deleteItemAsync(SECURE_KEY_USER);
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
  },

  completeOnboarding: async () => {
    await SecureStore.setItemAsync(SECURE_KEY_ONBOARDING, 'true');
    set({ onboardingComplete: true });
  },

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(SECURE_KEY_TOKEN);
      const refresh = await SecureStore.getItemAsync(SECURE_KEY_REFRESH);
      const userJson = await SecureStore.getItemAsync(SECURE_KEY_USER);
      const onboarding = await SecureStore.getItemAsync(SECURE_KEY_ONBOARDING);
      if (token && userJson) {
        const user: User = JSON.parse(userJson);
        set({
          accessToken: token,
          refreshToken: refresh,
          user,
          isAuthenticated: true,
          isHydrated: true,
          onboardingComplete: onboarding === 'true',
        });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },
}));
