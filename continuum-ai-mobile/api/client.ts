import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../constants/env';
import { useAuthStore } from '../store/authStore';

const API_URL = ENV.apiUrl;

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request interceptor: attach user ID header ───────────────────────────────
// Firebase manages token refresh internally — we pass the user ID for context.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const user = useAuthStore.getState().user;
  if (user?.id && config.headers) {
    config.headers['X-User-Id'] = user.id;
  }
  return config;
});

// ─── Response interceptor: sign out on hard 401 ──────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Firebase handles token refresh automatically.
      // A hard 401 means the session is truly expired — sign out.
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
