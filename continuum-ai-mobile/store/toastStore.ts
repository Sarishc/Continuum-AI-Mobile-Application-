import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastEntry {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastState {
  toast: ToastEntry | null;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
}

let _id = 0;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (message, type = 'info', duration = 3000) =>
    set({ toast: { id: ++_id, message, type, duration } }),
  hideToast: () => set({ toast: null }),
}));

/** Imperative helper — call outside of React components */
export function showToast(message: string, type: ToastType = 'info', duration = 3000) {
  useToastStore.getState().showToast(message, type, duration);
}
