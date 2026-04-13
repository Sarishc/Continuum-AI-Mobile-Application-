import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { resetPassword } from '../services/authService';
import { track } from '../services/analytics';

/**
 * Drop-in hook used by login.tsx and signup.tsx.
 * Delegates to Firebase via authStore — no more direct API calls.
 */
export function useAuth() {
  const router = useRouter();
  const {
    login,
    signup,
    logout,
    isAuthenticated,
    user,
    isLoading,
    error,
    clearError,
    completeOnboarding,
  } = useAuthStore();

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async (payload: { email: string; password: string }): Promise<boolean> => {
    const success = await login(payload.email, payload.password);
    if (success) {
      track('login_completed');
      router.replace('/(tabs)');
    }
    return success;
  };

  // ── Signup ────────────────────────────────────────────────────────────────
  const handleSignup = async (payload: {
    name: string;
    email: string;
    password: string;
  }): Promise<boolean> => {
    const success = await signup(payload.email, payload.password, payload.name);
    if (success) {
      track('signup_completed');
      router.replace('/onboarding');
    }
    return success;
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  // ── Password reset ────────────────────────────────────────────────────────
  const handleResetPassword = async (email: string) => {
    return resetPassword(email);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    signup: handleSignup,
    logout: handleLogout,
    resetPassword: handleResetPassword,
    clearError,
    completeOnboarding,
    // Legacy compat — was used in old layout hydration
    hydrate: () => {},
  };
}
