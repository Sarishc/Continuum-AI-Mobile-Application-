import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInUp,
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { track } from '../services/analytics';
import Svg, { Path } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { format } from 'date-fns';
import { AnimatedBackground } from '../components/ui/AnimatedBackground';
import { ReportCard, ReportCardData } from '../components/ui/ReportCard';
import { useHealth, calculateStreak } from '../hooks/useHealth';
import { useInsights } from '../hooks/useInsights';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { showToast } from '../store/toastStore';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { Spacing, BorderRadius } from '../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_WIDTH = 390;
const CARD_SCALE = (SCREEN_W - 48) / CARD_WIDTH;

// ─── Spinning arc (generating state) ─────────────────────────────────────────

function SpinningArc() {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(rotation);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[s.spinWrap, style]}>
      <View style={s.spinArc} />
    </Animated.View>
  );
}

// ─── Share icon ───────────────────────────────────────────────────────────────

function ShareIcon({ color = '#fff' }: { color?: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 6 12 2 8 6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 2v13" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ReportCardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const captureRef = useRef<ViewShot>(null);

  const { healthScore, timeline, healthProfile } = useHealth();
  const { insights } = useInsights();
  const { user } = useAuthStore();
  const { isPro } = useSubscriptionStore();

  const [captureLoading, setCaptureLoading] = useState(false);

  // ── Assemble card data ──────────────────────────────────────────────────
  const reportCardData: ReportCardData = {
    userName: user?.name?.split(' ')[0] ?? 'You',
    healthScore: healthScore ?? 0,
    previousScore: Math.max(0, (healthScore ?? 0) - 4),
    scoreDelta: 4,
    conditions: healthProfile?.conditions ?? [],
    entriesCount: timeline?.length ?? 0,
    streakDays: calculateStreak(timeline ?? []),
    topInsight:
      insights?.[0]?.summary?.slice(0, 100) ??
      'Keep logging your health data to generate insights.',
    topInsightSeverity: insights?.[0]?.severity ?? 'low',
    improvements: [
      'Consistent health tracking',
      ...((healthScore ?? 0) > 60 ? ['Health score above average'] : []),
    ],
    generatedDate: format(new Date(), 'MMMM d, yyyy'),
    isPro,
  };

  // ── Capture ─────────────────────────────────────────────────────────────
  const captureCard = async (): Promise<string | null> => {
    if (!captureRef.current) return null;
    try {
      const uri = await (captureRef.current as any).capture({
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
        snapshotContentContainer: false,
      });
      return uri as string;
    } catch {
      return null;
    }
  };

  const captureAndShare = async () => {
    if (!isPro) {
      router.push('/paywall' as any);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCaptureLoading(true);
    try {
      const uri = await captureCard();
      if (!uri) {
        showToast('Could not generate card. Try again.', 'error');
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your Health Report Card',
          UTI: 'public.png',
        });
        track('report_card_shared');
      } else {
        showToast('Sharing not available on this device.', 'error');
      }
    } finally {
      setCaptureLoading(false);
    }
  };

  const captureAndSave = async () => {
    if (!isPro) {
      router.push('/paywall' as any);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCaptureLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showToast('Photo library permission required.', 'error');
        return;
      }
      const uri = await captureCard();
      if (!uri) {
        showToast('Could not generate card. Try again.', 'error');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      track('report_card_saved');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Saved to your photo library! 📸', 'success');
    } finally {
      setCaptureLoading(false);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <AnimatedBackground />

      {/* ── Off-screen ViewShot (for capture) ── */}
      <ViewShot
        ref={captureRef}
        options={{ format: 'png', quality: 1.0 }}
        style={s.offscreen}
        collapsable={false}
      >
        <ReportCard data={reportCardData} animated={false} />
      </ViewShot>

      {/* ── Top controls ── */}
      <View style={s.topRow}>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={s.closeX}>×</Text>
        </TouchableOpacity>
        <Text style={s.screenTitle}>HEALTH REPORT CARD</Text>
        <View style={s.iconBtn} />
      </View>

      {/* ── Card preview ── */}
      <ScrollView
        contentContainerStyle={[s.previewScroll, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(400).springify()} style={s.previewWrap}>
          <View style={[s.cardScaleWrap, { transform: [{ scale: CARD_SCALE }] }]}>
            <ReportCard data={reportCardData} animated />
          </View>

          {/* Pro gate overlay — blur bottom 40% for free users */}
          {!isPro && (
            <View style={s.proGateOverlay}>
              <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={s.proGateCard}>
                <Text style={s.proGateLock}>🔒</Text>
                <Text style={s.proGateTitle}>Share with Pro</Text>
                <Text style={s.proGateSub}>
                  Upgrade to save and share your Health Report Card
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/paywall' as any)}
                  style={s.proGateBtn}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={Colors.gradientElectric}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.proGateBtnGradient}
                  >
                    <Text style={s.proGateBtnText}>Upgrade to Pro →</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* ── Bottom action area ── */}
      <View style={[s.actionArea, { paddingBottom: insets.bottom + 16 }]}>
        {captureLoading ? (
          <View style={s.generatingState}>
            <SpinningArc />
            <Text style={s.generatingText}>Generating your card…</Text>
          </View>
        ) : (
          <>
            <Text style={s.actionTitle}>SHARE YOUR PROGRESS</Text>
            <Text style={s.actionSub}>Show friends how far you've come</Text>

            <View style={s.buttons}>
              {/* Share Image */}
              <TouchableOpacity
                onPress={captureAndShare}
                activeOpacity={0.88}
                style={[s.btnTouchable, !isPro && s.btnDisabled]}
              >
                <LinearGradient
                  colors={Colors.gradientElectric}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.btnPrimary}
                >
                  {!isPro && <Text style={s.btnLock}>🔒 </Text>}
                  <ShareIcon color="#fff" />
                  <Text style={s.btnPrimaryText}>Share Image</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Save to Photos */}
              <TouchableOpacity
                onPress={captureAndSave}
                activeOpacity={0.85}
                style={[s.btnTouchable, !isPro && s.btnDisabled]}
              >
                <View style={s.btnSecondary}>
                  {!isPro && <Text style={s.btnLockGray}>🔒 </Text>}
                  <Text style={s.btnSecondaryEmoji}>📷</Text>
                  <Text style={s.btnSecondaryText}>Save to Photos</Text>
                </View>
              </TouchableOpacity>

              {/* Copy Link — coming soon */}
              <TouchableOpacity disabled style={s.btnGhost} activeOpacity={0.5}>
                <Text style={s.btnGhostText}>🔗 Share via Link · Coming Soon</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.obsidian,
  },

  // Off-screen capture target
  offscreen: {
    position: 'absolute',
    top: 9999,
    left: 0,
    width: CARD_WIDTH,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {
    fontSize: 22,
    color: Colors.textSecondary,
    lineHeight: 26,
    marginTop: -2,
  },
  screenTitle: {
    fontSize: 11,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.electric,
    letterSpacing: 2,
  },

  // Preview
  previewScroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  previewWrap: {
    width: CARD_WIDTH * CARD_SCALE,
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 20,
  },
  cardScaleWrap: {
    width: CARD_WIDTH,
    transformOrigin: 'top left',
  },

  // Pro gate
  proGateOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '42%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proGateCard: {
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[5],
  },
  proGateLock: { fontSize: 26 },
  proGateTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  proGateSub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  proGateBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: Spacing[2],
    minWidth: 200,
  },
  proGateBtnGradient: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  proGateBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.displaySemiBold,
    color: '#FFFFFF',
  },

  // Action area
  actionArea: {
    backgroundColor: Colors.abyss,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 0,
  },
  actionTitle: {
    fontSize: 18,
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
  },
  actionSub: {
    fontSize: 13,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    marginTop: 4,
  },
  buttons: {
    marginTop: 16,
    gap: 10,
  },
  btnTouchable: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  btnDisabled: { opacity: 0.45 },
  btnPrimary: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnLock: { fontSize: 14 },
  btnLockGray: { fontSize: 14 },
  btnPrimaryText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.displaySemiBold,
    color: '#FFFFFF',
  },
  btnSecondary: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  btnSecondaryEmoji: { fontSize: 16 },
  btnSecondaryText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.displaySemiBold,
    color: Colors.textSecondary,
  },
  btnGhost: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  btnGhostText: {
    fontSize: 13,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textMuted,
  },

  // Generating
  generatingState: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: Spacing[3],
  },
  spinWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinArc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: Colors.electric,
  },
  generatingText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
});
