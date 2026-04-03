import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../store/authStore';
import { registerAndSyncPushToken, useNotificationTap } from '../services/notifications';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Toast } from '../components/ui/Toast';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { Spacing } from '../constants/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 1000 * 60 * 5 },
  },
});

// ─── Network banner ───────────────────────────────────────────────────────────

function NetworkBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return () => unsub();
  }, []);

  if (!isOffline) return null;
  return (
    <View style={bannerStyles.banner}>
      <Text style={bannerStyles.text}>⚠ No internet connection — showing cached data</Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(210,153,34,0.15)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.warning,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    alignItems: 'center',
  },
  text: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.warning,
    textAlign: 'center',
  },
});

// ─── Auth + onboarding guard ──────────────────────────────────────────────────

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated, onboardingComplete } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup       = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === 'onboarding';

    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    if (!onboardingComplete) {
      if (!inOnboardingGroup) router.replace('/onboarding');
      return;
    }

    if (inAuthGroup || inOnboardingGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isHydrated, onboardingComplete, segments]);

  if (!isHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const { hydrate } = useAuthStore();

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  // Handle notification taps → deep link to correct screen
  useNotificationTap();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      registerAndSyncPushToken().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthGuard>
              <NetworkBanner />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="+not-found" />
                <Stack.Screen name="privacy" />
                <Stack.Screen name="index" />
              </Stack>
            </AuthGuard>
            {/* Global toast — renders above everything */}
            <Toast />
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
