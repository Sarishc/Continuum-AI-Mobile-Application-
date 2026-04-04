import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PurchasesPackage } from 'react-native-purchases';
import { AnimatedBackground } from '../components/ui/AnimatedBackground';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { getOfferings, purchasePackage, restorePurchases } from '../services/purchases';
import { showToast } from '../store/toastStore';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { Spacing, BorderRadius } from '../constants/theme';

const { width: W } = Dimensions.get('window');

// ─── Feature list ─────────────────────────────────────────────────────────────

const FEATURES = [
  { label: 'Unlimited Health Entries', sub: 'Track as much as you need' },
  { label: 'AI Mode Analysis',         sub: 'Full Claude AI with RAG reasoning' },
  { label: 'Expanded Insights',        sub: 'See full reasoning and confidence scores' },
  { label: 'Unlimited AI Chat',        sub: 'Ask anything about your health' },
  { label: 'Weekly Health Briefs',     sub: 'Personalized Sunday summaries' },
  { label: 'Health Report Card',       sub: 'Shareable health progress summary' },
];

// ─── Checkmark icon ──────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <View style={s.checkCircle}>
      <Text style={s.checkMark}>✓</Text>
    </View>
  );
}

// ─── Close button ─────────────────────────────────────────────────────────────

function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={s.closeBtn} onPress={onPress} hitSlop={12}>
      <Text style={s.closeX}>×</Text>
    </TouchableOpacity>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  type,
  price,
  period,
  billing,
  saving,
  selected,
  onSelect,
}: {
  type: 'monthly' | 'annual';
  price: string;
  period: string;
  billing: string;
  saving?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const isAnnual = type === 'annual';
  return (
    <TouchableOpacity
      style={[
        s.planCard,
        isAnnual && s.planCardAnnual,
        selected && s.planCardSelected,
        isAnnual && selected && s.planCardAnnualSelected,
      ]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      {isAnnual && (
        <View style={s.bestValueBadge}>
          <Text style={s.bestValueText}>BEST VALUE</Text>
        </View>
      )}
      <Text style={[s.planPrice, isAnnual && selected && s.planPriceElectric]}>
        {price}
      </Text>
      <Text style={[s.planPeriod, isAnnual && s.planPeriodSub]}>{period}</Text>
      <Text style={s.planBilling}>{billing}</Text>
      {saving && <Text style={s.planSaving}>{saving}</Text>}
    </TouchableOpacity>
  );
}

// ─── Main paywall ─────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setCustomerInfo } = useSubscriptionStore();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [packages, setPackages] = useState<{
    monthly: PurchasesPackage | null;
    annual: PurchasesPackage | null;
  }>({ monthly: null, annual: null });
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    getOfferings().then((offering) => {
      if (!offering) return;
      const monthly = offering.availablePackages.find(
        (p) => p.packageType === 'MONTHLY'
      ) ?? null;
      const annual = offering.availablePackages.find(
        (p) => p.packageType === 'ANNUAL'
      ) ?? null;
      setPackages({ monthly, annual });
    });
  }, []);

  const handlePurchase = async () => {
    const pkg = selectedPlan === 'annual' ? packages.annual : packages.monthly;
    if (!pkg) {
      // No RC offering configured yet — show toast for demo
      showToast('Configure RevenueCat offerings to enable purchases.', 'info');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasing(true);
    try {
      const info = await purchasePackage(pkg);
      setCustomerInfo(info);
      showToast('Welcome to Pro! 🎉', 'success');
      router.back();
    } catch (e: any) {
      if (e?.userCancelled) {
        // User cancelled — do nothing
      } else {
        showToast('Purchase failed. Please try again.', 'error');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestoring(true);
    try {
      const info = await restorePurchases();
      setCustomerInfo(info);
      showToast('Purchases restored!', 'success');
      router.back();
    } catch {
      showToast('Nothing to restore.', 'info');
    } finally {
      setRestoring(false);
    }
  };

  const ctaLabel = () => {
    if (purchasing) return '';
    if (selectedPlan === 'annual') return 'Get Pro · $79.99/yr';
    return 'Get Pro · $9.99/mo';
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <AnimatedBackground />

      {/* Close */}
      <CloseButton onPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={s.hero}>
          <Text style={s.wordmark}>CONTINUUM</Text>
          <Text style={s.heroHeading}>
            {'Unlock Your\nHealth '}
            <Text style={s.heroAI}>Intelligence</Text>
          </Text>
          <Text style={s.heroSub}>
            Everything you need to understand and improve your health.
          </Text>
        </Animated.View>

        {/* ── Features ── */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={s.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <CheckIcon />
              <View style={s.featureText}>
                <Text style={s.featureLabel}>{f.label}</Text>
                {f.sub ? <Text style={s.featureSub}>{f.sub}</Text> : null}
              </View>
            </View>
          ))}
        </Animated.View>

        {/* ── Pricing cards ── */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)} style={s.plans}>
          <PlanCard
            type="monthly"
            price="$9.99"
            period="/month"
            billing="Billed monthly"
            selected={selectedPlan === 'monthly'}
            onSelect={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPlan('monthly');
            }}
          />
          <PlanCard
            type="annual"
            price="$6.67"
            period="/month"
            billing="Billed $79.99/year"
            saving="Save 33%"
            selected={selectedPlan === 'annual'}
            onSelect={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPlan('annual');
            }}
          />
        </Animated.View>

        {/* ── CTA ── */}
        <Animated.View entering={FadeInUp.delay(240).duration(400)} style={s.ctaWrap}>
          <TouchableOpacity
            onPress={handlePurchase}
            disabled={purchasing}
            activeOpacity={0.88}
            style={s.ctaTouchable}
          >
            <LinearGradient
              colors={Colors.gradientElectric}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.ctaGradient}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.ctaLabel}>{ctaLabel()}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Restore */}
          <TouchableOpacity onPress={handleRestore} disabled={restoring} hitSlop={8}>
            <Text style={s.restoreLink}>
              {restoring ? 'Restoring…' : 'Restore Purchases'}
            </Text>
          </TouchableOpacity>

          {/* Disclaimer */}
          <Text style={s.disclaimer}>
            Subscription auto-renews. Cancel anytime in App Store settings.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.obsidian,
  },
  scroll: {
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[6],
    gap: Spacing[6],
  },

  // Close
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: Spacing[5],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeX: {
    fontSize: 22,
    color: Colors.textSecondary,
    lineHeight: 26,
    marginTop: -2,
  },

  // Hero
  hero: { gap: Spacing[3], paddingTop: Spacing[4] },
  wordmark: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.electric,
    letterSpacing: 4,
  },
  heroHeading: {
    fontSize: 38,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.textPrimary,
    lineHeight: 44,
    letterSpacing: -1,
  },
  heroAI: { color: Colors.electric },
  heroSub: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginTop: Spacing[1],
  },

  // Features
  features: { gap: Spacing[3] },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.positiveGlow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkMark: {
    fontSize: 13,
    color: Colors.positive,
    fontFamily: FontFamily.displayBold,
  },
  featureText: { flex: 1, gap: 2 },
  featureLabel: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.displayMedium,
    color: Colors.textPrimary,
  },
  featureSub: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },

  // Pricing
  plans: { flexDirection: 'row', gap: Spacing[3] },
  planCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 2,
  },
  planCardAnnual: {
    backgroundColor: Colors.electricMist,
    borderColor: Colors.border,
  },
  planCardSelected: {
    borderColor: Colors.electric,
    borderWidth: 1.5,
  },
  planCardAnnualSelected: {
    borderColor: Colors.electric,
    borderWidth: 1.5,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: Colors.electric,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 8,
  },
  bestValueText: {
    fontSize: 9,
    fontFamily: FontFamily.displayBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  planPrice: {
    fontSize: 28,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.textPrimary,
    marginTop: Spacing[2],
  },
  planPriceElectric: { color: Colors.electric },
  planPeriod: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  planPeriodSub: { color: Colors.textSecondary },
  planBilling: {
    fontSize: 11,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  planSaving: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.positive,
    marginTop: 4,
  },

  // CTA
  ctaWrap: { gap: Spacing[3], alignItems: 'center' },
  ctaTouchable: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  ctaGradient: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    // electric shadow
    shadowColor: Colors.electric,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaLabel: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.displayBold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  restoreLink: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
    textDecorationColor: Colors.textMuted,
  },
  disclaimer: {
    fontSize: 10,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: Spacing[4],
  },
});
