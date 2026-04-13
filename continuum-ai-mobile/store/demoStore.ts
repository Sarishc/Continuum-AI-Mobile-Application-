import { create } from 'zustand';
import { Platform } from 'react-native';

// On web, persist demo flag in sessionStorage so it survives SPA navigation
const SESSION_KEY = 'continuum_demo_mode';

function readPersistedDemo(): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    return typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

interface DemoState {
  isDemoMode: boolean;
  enterDemo: () => void;
}

export const useDemoStore = create<DemoState>((set) => ({
  isDemoMode: readPersistedDemo(),
  enterDemo: () => {
    if (Platform.OS === 'web') {
      try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch {}
    }
    set({ isDemoMode: true });
  },
}));
