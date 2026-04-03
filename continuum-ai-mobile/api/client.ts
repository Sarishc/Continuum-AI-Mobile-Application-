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

// ─── Request interceptor: attach Bearer token ─────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: handle 401 / refresh ──────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

/** Bare axios instance — never intercepted, avoids refresh loop */
const _rawAxios = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const store = useAuthStore.getState();
      const currentRefreshToken = store.refreshToken;

      try {
        if (!currentRefreshToken) throw new Error('No refresh token');

        const resp = await _rawAxios.post<{
          access_token: string;
          refresh_token: string;
        }>('/auth/refresh', { refresh_token: currentRefreshToken });

        const newAccess = resp.data.access_token;
        const newRefresh = resp.data.refresh_token;

        await store.setTokens(newAccess, newRefresh);

        refreshQueue.forEach((cb) => cb(newAccess));
        refreshQueue = [];

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        }
        return apiClient(originalRequest);
      } catch {
        refreshQueue.forEach((cb) => cb(''));
        refreshQueue = [];
        await useAuthStore.getState().logout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
