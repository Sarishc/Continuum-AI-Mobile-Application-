import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Syne_400Regular,
  Syne_500Medium,
  Syne_600SemiBold,
  Syne_700Bold,
  Syne_800ExtraBold,
} from '@expo-google-fonts/syne';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { initializePurchases, getCustomerInfo } from '../services/purchases';
import { registerAndSyncPushToken, useNotificationTap, scheduleWeeklyBrief } from '../services/notifications';
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
    backgroundColor: 'rgba(255,181,71,0.10)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.caution,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    alignItems: 'center',
  },
  text: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.caution,
    textAlign: 'center',
    letterSpacing: 0.3,
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
  const { hydrate, user } = useAuthStore();
  const { setCustomerInfo, setLoading, resetDailyLimits } = useSubscriptionStore();

  const [fontsLoaded] = useFonts({
    Syne_400Regular,
    Syne_500Medium,
    Syne_600SemiBold,
    Syne_700Bold,
    Syne_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Handle notification taps → deep link to correct screen
  useNotificationTap();

  useEffect(() => {
    hydrate();
  }, []);

  // RevenueCat init — runs once user is known
  useEffect(() => {
    if (!user?.id) return;
    initializePurchases(user.id)
      .then(async () => {
        const info = await getCustomerInfo();
        setCustomerInfo(info);
      })
      .catch(() => setLoading(false));
  }, [user?.id]);

  // Usage reset — daily AI limit + monthly entry limit
  useEffect(() => {
    const checkResets = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const thisMonth = format(new Date(), 'yyyy-MM');
      const lastDay = await AsyncStorage.getItem('last_usage_day');
      const lastMonth = await AsyncStorage.getItem('last_usage_month');
      if (lastDay !== today) {
        resetDailyLimits();
        await AsyncStorage.setItem('last_usage_day', today);
      }
      if (lastMonth !== thisMonth) {
        useSubscriptionStore.setState({ entriesThisMonth: 0 });
        await AsyncStorage.setItem('last_usage_month', thisMonth);
      }
    };
    checkResets().catch(() => {});
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      registerAndSyncPushToken()
        .then(() => scheduleWeeklyBrief())
        .catch(() => {});
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
        <StatusBar style="light" backgroundColor="transparent" translucent />
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
                <Stack.Screen
                  name="paywall"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom',
                  }}
                />
                <Stack.Screen
                  name="weekly-brief"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom',
                  }}
                />
                <Stack.Screen
                  name="report-card"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom',
                  }}
                />
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
  root: { flex: 1, backgroundColor: Colors.void },
  loading: {
    flex: 1,
    backgroundColor: Colors.void,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
