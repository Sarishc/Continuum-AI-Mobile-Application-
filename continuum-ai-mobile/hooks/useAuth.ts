import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import type { LoginPayload, SignupPayload } from '../api/auth';

export function useAuth() {
  const router = useRouter();
  const { login, logout, isAuthenticated, user, hydrate } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (payload: LoginPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await authApi.login(payload);
      await login(data.tokens.accessToken, data.user);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (payload: SignupPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await authApi.signup(payload);
      await login(data.tokens.accessToken, data.user);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Sign up failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    } finally {
      await logout();
      router.replace('/(auth)/login');
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    signup: handleSignup,
    logout: handleLogout,
    hydrate,
    clearError: () => setError(null),
  };
}
