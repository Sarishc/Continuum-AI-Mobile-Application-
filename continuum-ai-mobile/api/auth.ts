import axios from 'axios';
import apiClient from './client';
import { ENV } from '../constants/env';
import type { User, AuthTokens } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

/** Fresh instance — never intercepted, avoids refresh loop in client.ts */
const rawAxios = axios.create({
  baseURL: ENV.apiUrl,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

export async function refreshTokens(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await rawAxios.post<{
    access_token: string;
    refresh_token: string;
  }>('/auth/refresh', { refresh_token: refreshToken });
  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
  };
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', payload),

  signup: (payload: SignupPayload) =>
    apiClient.post<AuthResponse>('/auth/signup', payload),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get<User>('/auth/me'),
};
