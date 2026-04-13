import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
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
import { useDemoStore } from '../store/demoStore';
import { useHealthStore } from '../store/healthStore';
import { onAuthStateChange } from '../services/authService';
import { initializePurchases, getCustomerInfo } from '../services/purchases';
import { registerAndSyncPushToken, useNotificationTap, scheduleWeeklyBrief } from '../services/notifications';
import { track } from '../services/analytics';
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
    if (Platform.OS === 'web') return; // NetInfo not needed on web
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
  const { isDemoMode } = useDemoStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Demo mode bypasses all auth checks — investor demos work without login
    if (isDemoMode) return;
    if (!isHydrated) return;

    const inAuthGroup       = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === 'onboarding';

    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    if (!onboardingComplete) {
      if (!inOnboardingGroup) router.replace('/onboarding' as any);
      return;
    }

    if (inAuthGroup || inOnboardingGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isHydrated, isDemoMode, onboardingComplete, segments]);

  // Show spinner while Firebase resolves the initial auth state
  if (!isHydrated && !isDemoMode) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

// ─── App stack (shared) ───────────────────────────────────────────────────────

function AppStack() {
  return (
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
            options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="weekly-brief"
            options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="report-card"
            options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="referral"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="analytics"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="family"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="trends"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
        </Stack>
      </AuthGuard>
      <Toast />
    </QueryClientProvider>
  );
}

// ─── Web left-panel — branding / tagline ─────────────────────────────────────

function WebLeftPanel() {
  return (
    <View style={webPanel.left}>
      {/* C monogram */}
      <View style={webPanel.monogram}>
        <Text style={webPanel.monogramText}>C</Text>
      </View>

      <Text style={webPanel.appName}>{'Continuum\nAI'}</Text>
      <Text style={webPanel.tagline}>{'Your personal health\nintelligence system.'}</Text>

      <View style={webPanel.demoBadge}>
        <Text style={webPanel.demoLabel}>LIVE DEMO</Text>
        <Text style={webPanel.demoSub}>Explore with sample data</Text>
      </View>

      <View style={webPanel.featureList}>
        {[
          '🧬 AI-powered health analysis',
          '📊 Proactive insights',
          '📅 Complete health timeline',
          '💬 Specialist recommendations',
        ].map((item, i) => (
          <Text key={i} style={webPanel.featureItem}>{item}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── Web right-panel — stats ──────────────────────────────────────────────────

function WebRightPanel() {
  const stats = [
    { number: '38M', label: 'Americans with\npre-diabetes' },
    { number: '12 min', label: 'Average doctor\nvisit length' },
    { number: '24/7', label: 'AI health\nintelligence' },
  ];

  return (
    <View style={webPanel.right}>
      <Text style={webPanel.statsTitle}>The problem we solve</Text>
      {stats.map((s, i) => (
        <View key={i} style={webPanel.statRow}>
          <Text style={webPanel.statNumber}>{s.number}</Text>
          <Text style={webPanel.statLabel}>{s.label}</Text>
        </View>
      ))}

      <View style={webPanel.separator} />
      <Text style={webPanel.buildTag}>continuum-health.app</Text>
    </View>
  );
}

const webPanel = StyleSheet.create({
  left: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 48,
    justifyContent: 'center',
    maxWidth: 300,
  },
  monogram: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.electric,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  monogramText: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    color: '#fff',
  },
  appName: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 34,
    color: Colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 38,
    marginBottom: 12,
  },
  tagline: {
    fontFamily: FontFamily.bodyRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 28,
  },
  demoBadge: {
    backgroundColor: Colors.electricMist,
    borderWidth: 1,
    borderColor: Colors.electric,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 28,
    alignSelf: 'flex-start',
  },
  demoLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    color: Colors.electric,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  demoSub: {
    fontFamily: FontFamily.bodyRegular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  featureList: { gap: 10 },
  featureItem: {
    fontFamily: FontFamily.bodyRegular,
    fontSize: 13,
    color: Colors.textTertiary,
    lineHeight: 20,
  },
  right: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 48,
    justifyContent: 'center',
    maxWidth: 260,
    alignItems: 'flex-start',
  },
  statsTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  statRow: { marginBottom: 28 },
  statNumber: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 32,
    color: Colors.electric,
    letterSpacing: -1,
    lineHeight: 34,
  },
  statLabel: {
    fontFamily: FontFamily.bodyRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 2,
    maxWidth: 160,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.rim,
    width: '100%',
    marginBottom: 20,
    marginTop: 4,
  },
  buildTag: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
});

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const { user, setUser, setHydrated } = useAuthStore();
  const { setCustomerInfo, setLoading, resetDailyLimits } = useSubscriptionStore();
  const { width: windowWidth } = useWindowDimensions();

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

  // Web demo setup — runs once on mount, ensures demo data is always loaded
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const { isDemoMode, enterDemo } = useDemoStore.getState();
    const { loadDemoData } = useHealthStore.getState();
    const { setUser: _setUser, setHydrated: _setHydrated, setOnboardingComplete: _setOC } = useAuthStore.getState();
    if (!isDemoMode) enterDemo();
    loadDemoData();
    _setUser({ id: 'web-demo', name: 'Alex Morgan', email: 'demo@continuum.app', createdAt: new Date().toISOString(), isEmailVerified: true });
    _setHydrated();
    _setOC(true);
    useSubscriptionStore.setState({ isPro: true, isLoading: false });
  }, []);

  // Firebase auth state listener — skip callback when demo mode is active
  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      // Never overwrite the demo user with a null Firebase user
      if (useDemoStore.getState().isDemoMode) return;
      setUser(firebaseUser);
      setHydrated();
    });
    return unsubscribe; // cleanup on unmount
  }, []);

  // RevenueCat init — runs once user is known
  useEffect(() => {
    if (Platform.OS === 'web' || !user?.id) return;
    initializePurchases(user.id)
      .then(async () => {
        const info = await getCustomerInfo();
        setCustomerInfo(info);
        track('app_opened', {
          is_pro: !!(info?.entitlements?.active?.['pro']),
        });
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
    if (fontsLoaded && Platform.OS !== 'web') {
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

  // ── Web layout ─────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    const isWide = windowWidth >= 900;

    return (
      <ErrorBoundary>
        <View style={webStyles.outerPage}>
          <StatusBar style="light" />

          {/* Row: [left panel] [phone frame + hint] [right panel] */}
          <View style={webStyles.row}>
            {isWide && <WebLeftPanel />}

            {/* Phone frame column */}
            <View style={webStyles.phoneColumn}>
              <View style={webStyles.phoneFrame}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <SafeAreaProvider>
                    <AppStack />
                  </SafeAreaProvider>
                </GestureHandlerRootView>
              </View>
            </View>

            {isWide && <WebRightPanel />}
          </View>
        </View>
      </ErrorBoundary>
    );
  }

  // ── Native layout ──────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="light" backgroundColor="transparent" translucent />
        <SafeAreaProvider>
          <AppStack />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// ─── Native styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.obsidian },
  loading: {
    flex: 1,
    backgroundColor: Colors.void,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Web styles ───────────────────────────────────────────────────────────────

const webStyles = StyleSheet.create({
  outerPage: {
    flex: 1,
    backgroundColor: Colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh' as any,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100vh' as any,
  },
  phoneColumn: {
    alignItems: 'center',
    height: '100vh' as any,
    paddingVertical: 32,
    justifyContent: 'center',
    gap: 16,
  },
  phoneFrame: {
    width: 430,
    height: 880,
    maxHeight: 'calc(100vh - 64px)' as any,
    backgroundColor: Colors.void,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.rim,
    borderRadius: 44,
    shadowColor: Colors.electric,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 60,
  } as any,
});
