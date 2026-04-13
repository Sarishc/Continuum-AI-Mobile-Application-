import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useDemoStore } from '../store/demoStore';
import { useHealthStore } from '../store/healthStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { Colors } from '../constants/colors';

const WEB_DEMO_USER = {
  id: 'web-demo',
  name: 'Alex Morgan',
  email: 'demo@continuum.app',
  createdAt: new Date().toISOString(),
  isEmailVerified: true,
};

export default function Index() {
  const { isAuthenticated } = useAuthStore();
  const { isDemoMode } = useDemoStore();
  const [webReady, setWebReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    (async () => {
      const { isDemoMode, enterDemo } = useDemoStore.getState();
      const { loadDemoData } = useHealthStore.getState();
      const { setUser, completeOnboarding, setHydrated, setOnboardingComplete } = useAuthStore.getState();
      // Always set up demo data on web — sessionStorage may persist isDemoMode
      // across page reloads but auth/health state is always reset
      if (!isDemoMode) enterDemo();
      loadDemoData();
      setUser(WEB_DEMO_USER);
      setHydrated();
      setOnboardingComplete(true);
      await completeOnboarding();
      useSubscriptionStore.setState({ isPro: true, isLoading: false });
      if (!cancelled) setWebReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!webReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  // Demo mode always routes to tabs — Firebase auth state doesn't matter
  return isAuthenticated || isDemoMode ? (
    <Redirect href="/(tabs)" />
  ) : (
    <Redirect href="/(auth)/login" />
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: Colors.void,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
