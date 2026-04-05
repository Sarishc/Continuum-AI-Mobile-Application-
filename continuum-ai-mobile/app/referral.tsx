import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  getMyReferralCode,
  getReferralHistory,
  generateShareMessage,
  ReferralData,
  ReferralHistoryItem,
} from '../services/referral';
import { track } from '../services/analytics';
import { showToast } from '../store/toastStore';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { Spacing, BorderRadius } from '../constants/theme';

const { width: W } = Dimensions.get('window');

// ─── Share option card ────────────────────────────────────────────────────────

function ShareCard({
  emoji,
  emojiBg,
  title,
  sub,
  onPress,
}: {
  emoji: string;
  emojiBg: string;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={sc.card}>
      <View style={[sc.iconBox, { backgroundColor: emojiBg }]}>
        <Text style={sc.emoji}>{emoji}</Text>
      </View>
      <View style={sc.textCol}>
        <Text style={sc.title}>{title}</Text>
        <Text style={sc.sub}>{sub}</Text>
      </View>
      <Text style={sc.arrow}>→</Text>
    </TouchableOpacity>
  );
}
const sc = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.rim,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
  textCol: { flex: 1, gap: 2 },
  title: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.displaySemiBold,
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  arrow: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
});

// ─── How-it-works step ────────────────────────────────────────────────────────

function HowStep({
  num,
  title,
  sub,
  isLast,
}: {
  num: string;
  title: string;
  sub: string;
  isLast?: boolean;
}) {
  return (
    <View>
      <View style={hw.row}>
        <Text style={hw.num}>{num}</Text>
        <View style={hw.textCol}>
          <Text style={hw.title}>{title}</Text>
          <Text style={hw.sub}>{sub}</Text>
        </View>
      </View>
      {!isLast && <View style={hw.sep} />}
    </View>
  );
}
const hw = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[4], paddingVertical: Spacing[3] },
  num: {
    fontSize: 32,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.electric,
    lineHeight: 36,
    width: 32,
  },
  textCol: { flex: 1, paddingTop: 2 },
  title: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  sep: { height: 1, backgroundColor: Colors.rim, marginLeft: 40 },
});

// ─── Referral history row ─────────────────────────────────────────────────────

function HistoryRow({ item }: { item: ReferralHistoryItem }) {
  const isRewarded = item.status === 'rewarded';
  const initials = item.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <View style={hr.row}>
      <View style={[hr.avatar, { backgroundColor: isRewarded ? Colors.positiveGlow : Colors.electricMist }]}>
        <Text style={[hr.initials, { color: isRewarded ? Colors.positive : Colors.electric }]}>{initials}</Text>
      </View>
      <View style={hr.mid}>
        <Text style={hr.name}>{item.name}</Text>
        <Text style={hr.date}>Joined {item.date}</Text>
      </View>
      <View style={[hr.pill, { backgroundColor: isRewarded ? Colors.positiveGlow : Colors.electricMist }]}>
        <Text style={[hr.pillText, { color: isRewarded ? Colors.positive : Colors.electric }]}>
          {isRewarded ? '+7 days Pro' : 'Pending'}
        </Text>
      </View>
    </View>
  );
}
const hr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 56, gap: Spacing[3] },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: FontSize.sm, fontFamily: FontFamily.displayBold },
  mid: { flex: 1, gap: 2 },
  name: { fontSize: FontSize.sm, fontFamily: FontFamily.displayMedium, color: Colors.textPrimary },
  date: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyRegular, color: Colors.textMuted },
  pill: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  pillText: { fontSize: 11, fontFamily: FontFamily.bodyMedium },
});

// ─── Section header ───────────────────────────────────────────────────────────

function SH({ title }: { title: string }) {
  return <Text style={shS.t}>{title}</Text>;
}
const shS = StyleSheet.create({
  t: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginTop: Spacing[5],
    marginBottom: Spacing[3],
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Referral() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [copied, setCopied] = useState(false);

  // Code card flash animation
  const cardBg = useSharedValue(0);
  const cardAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: cardBg.value === 1 ? Colors.electricMist : 'transparent',
  }));

  useEffect(() => {
    track('referral_page_viewed');
    Promise.all([getMyReferralCode(), getReferralHistory()]).then(([data, hist]) => {
      if (data) setReferralData(data);
      setHistory(hist);
    });
  }, []);

  const handleCopyCode = useCallback(async () => {
    if (!referralData) return;
    await Clipboard.setStringAsync(referralData.code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    track('referral_code_copied');
    setCopied(true);
    cardBg.value = withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 1200 }));
    setTimeout(() => setCopied(false), 1500);
  }, [referralData]);

  const handleNativeShare = useCallback(async () => {
    if (!referralData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    track('referral_shared', { method: 'native_share' });
    await Share.share({
      message: generateShareMessage(referralData.code),
      url: referralData.referralUrl,
      title: 'Join Continuum AI',
    });
  }, [referralData]);

  const handleCopyLink = useCallback(async () => {
    if (!referralData) return;
    await Clipboard.setStringAsync(referralData.referralUrl);
    track('referral_shared', { method: 'copy_link' });
    showToast('Link copied!', 'success');
  }, [referralData]);

  const handleCopyMessage = useCallback(async () => {
    if (!referralData) return;
    await Clipboard.setStringAsync(generateShareMessage(referralData.code));
    track('referral_shared', { method: 'copy_message' });
    showToast('Message copied!', 'success');
  }, [referralData]);

  const code = referralData?.code ?? '———';
  const proEarned = (referralData?.rewardedReferrals ?? 0) * 7;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>INVITE FRIENDS</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* ── Hero card ── */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={['#0f1117', '#1a1d27']}
            style={s.heroCard}
          >
            <Text style={s.heroEmoji}>🎁</Text>
            <Text style={s.heroHeadline}>{"Give 7 days Pro.\nGet 7 days Pro."}</Text>
            <Text style={s.heroSub}>
              Every friend who joins with your code gets 7 days of Pro free. So do you.
            </Text>

            {/* Stats row */}
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={s.statNum}>{referralData?.totalReferrals ?? 0}</Text>
                <Text style={s.statLabel}>friends invited</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statNum}>{proEarned}</Text>
                <Text style={s.statLabel}>Pro days earned</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statNum}>{referralData?.pendingReferrals ?? 0}</Text>
                <Text style={s.statLabel}>pending</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Your code ── */}
        <SH title="YOUR CODE" />
        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
          <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.85}>
            <Animated.View style={[s.codeCard, cardAnimStyle]}>
              <Text style={s.codeText}>{code}</Text>
              <Text style={s.codeSub}>{copied ? '✓ Copied!' : 'Tap to copy'}</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Share options ── */}
        <SH title="SHARE YOUR LINK" />
        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={s.shareCol}>
          <ShareCard
            emoji="💬"
            emojiBg={Colors.electricMist}
            title="Share Invite Link"
            sub="Opens native share sheet"
            onPress={handleNativeShare}
          />
          <ShareCard
            emoji="🔗"
            emojiBg={Colors.positiveGlow}
            title="Copy Invite Link"
            sub="Share anywhere manually"
            onPress={handleCopyLink}
          />
          <ShareCard
            emoji="📝"
            emojiBg={Colors.cautionGlow}
            title="Copy Invite Message"
            sub="Pre-written message with your code"
            onPress={handleCopyMessage}
          />
        </Animated.View>

        {/* ── How it works ── */}
        <SH title="HOW IT WORKS" />
        <Animated.View
          entering={FadeInDown.delay(160).duration(400)}
          style={s.howCard}
        >
          <HowStep
            num="1"
            title="Share your code"
            sub="Send your unique code or link to a friend"
          />
          <HowStep
            num="2"
            title="They sign up"
            sub="Friend downloads Continuum and enters your code"
          />
          <HowStep
            num="3"
            title="You both get Pro"
            sub="7 days of Continuum Pro — free for both of you"
            isLast
          />
        </Animated.View>

        {/* ── Referral history ── */}
        <SH title="YOUR REFERRALS" />
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={s.historyCard}>
          {history.length === 0 ? (
            <View style={s.emptyHistory}>
              <Text style={s.emptyTitle}>No referrals yet</Text>
              <Text style={s.emptySub}>Share your code above to get started</Text>
            </View>
          ) : (
            history.map((item, i) => (
              <View key={i}>
                <HistoryRow item={item} />
                {i < history.length - 1 && <View style={s.rowDivider} />}
              </View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.void },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[3],
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: Colors.textSecondary, fontFamily: FontFamily.displayRegular, lineHeight: 26 },
  headerTitle: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  scroll: { paddingHorizontal: Spacing[4] },

  // Hero
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(79,126,255,0.5)',
    padding: 28,
  },
  heroEmoji: { fontSize: 32, marginBottom: Spacing[3] },
  heroHeadline: {
    fontSize: 28,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.textPrimary,
    lineHeight: 32,
    letterSpacing: -1,
  },
  heroSub: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.rim,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 28, fontFamily: FontFamily.displayExtraBold, color: Colors.electric },
  statLabel: { fontSize: 10, fontFamily: FontFamily.bodyRegular, color: Colors.textMuted, textAlign: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.rim },

  // Code card
  codeCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.electric,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 36,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.electric,
    letterSpacing: 4,
  },
  codeSub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    marginTop: 6,
  },

  // Share
  shareCol: { gap: Spacing[3] },

  // How it works
  howCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.rim,
    paddingHorizontal: 20,
  },

  // History
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.rim,
    padding: 16,
  },
  rowDivider: { height: 1, backgroundColor: Colors.rim },
  emptyHistory: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyTitle: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium, color: Colors.textMuted, fontStyle: 'italic' },
  emptySub: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyRegular, color: Colors.textMuted },
});
