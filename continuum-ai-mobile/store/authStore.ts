import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types';

const SECURE_KEY_TOKEN = 'continuum_access_token';
const SECURE_KEY_USER = 'continuum_user';
const SECURE_KEY_ONBOARDING = 'onboarding_complete';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  onboardingComplete: boolean;

  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isHydrated: false,
  onboardingComplete: false,

  login: async (token, user) => {
    await SecureStore.setItemAsync(SECURE_KEY_TOKEN, token);
    await SecureStore.setItemAsync(SECURE_KEY_USER, JSON.stringify(user));
    set({ accessToken: token, user, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(SECURE_KEY_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_KEY_USER);
    set({ accessToken: null, user: null, isAuthenticated: false });
  },

  completeOnboarding: async () => {
    await SecureStore.setItemAsync(SECURE_KEY_ONBOARDING, 'true');
    set({ onboardingComplete: true });
  },

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(SECURE_KEY_TOKEN);
      const userJson = await SecureStore.getItemAsync(SECURE_KEY_USER);
      const onboarding = await SecureStore.getItemAsync(SECURE_KEY_ONBOARDING);
      if (token && userJson) {
        const user: User = JSON.parse(userJson);
        set({
          accessToken: token,
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
