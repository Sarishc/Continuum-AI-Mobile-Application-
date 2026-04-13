import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { hapticImpact } from '@/utils/haptics';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';

export type ProFeature = 'ai_chat' | 'expand_insight' | 'upload_entry' | 'ai_mode';

const FEATURE_COPY: Record<ProFeature, { title: string; limit: string }> = {
  upload_entry: {
    title: 'Unlock Unlimited Entries',
    limit: "You've used 3/3 free entries this month",
  },
  ai_mode: {
    title: 'AI Mode',
    limit: 'AI Mode is a Pro feature',
  },
  expand_insight: {
    title: 'Full Insights',
    limit: 'Full insights require Pro',
  },
  ai_chat: {
    title: 'Unlimited AI Chat',
    limit: "You've used your 1 free message today",
  },
};

interface ProGateProps {
  feature: ProFeature;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ProGate({ feature, children, style }: ProGateProps) {
  const router = useRouter();
  const { isPro, canUploadEntry, canUseAI } = useSubscriptionStore();

  const hasAccess = () => {
    switch (feature) {
      case 'expand_insight': return isPro;
      case 'ai_mode':        return isPro;
      case 'upload_entry':   return canUploadEntry();
      case 'ai_chat':        return canUseAI();
    }
  };

  if (hasAccess()) return <>{children}</>;

  const { title, limit } = FEATURE_COPY[feature];

  return (
    <View style={[s.container, style]}>
      {/* Blurred content underneath */}
      <View style={s.blurredContent} pointerEvents="none">
        {children}
      </View>
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(10, 11, 15, 0.85)' },
        ]}
      />

      {/* Upgrade card overlay */}
      <View style={s.card}>
        <Text style={s.lockEmoji}>🔒</Text>
        <Text style={s.title}>{title}</Text>
        <Text style={s.limit}>{limit}</Text>

        <TouchableOpacity
          onPress={() => {
            hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/paywall' as any);
          }}
          activeOpacity={0.88}
          style={s.ctaTouchable}
        >
          <LinearGradient
            colors={Colors.gradientElectric}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.cta}
          >
            <Text style={s.ctaText}>Upgrade to Pro</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: BorderRadius.md,
  },
  blurredContent: {
    opacity: 0.3,
  },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[5],
  },
  lockEmoji: { fontSize: 28 },
  title: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  limit: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  ctaTouchable: {
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: 240,
    width: '100%',
  },
  cta: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  ctaText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.displaySemiBold,
    color: '#FFFFFF',
  },
});
