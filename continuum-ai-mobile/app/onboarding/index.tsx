import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import Step1 from './step1';
import Step2 from './step2';
import Step3 from './step3';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';

const { width: W } = Dimensions.get('window');
const TOTAL = 3;

function DotIndicators({ page }: { page: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: TOTAL }).map((_, i) => {
        const isActive = i === page;
        return (
          <Animated.View
            key={i}
            style={[
              dotStyles.dot,
              {
                width: isActive ? 24 : 8,
                backgroundColor: isActive ? Colors.primary : Colors.border,
                opacity: isActive ? 1 : 0.6,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});

export default function OnboardingScreen() {
  const pagerRef = useRef<PagerView>(null);
  const [page, setPage] = useState(0);
  const { completeOnboarding } = useAuthStore();

  const goNext = useCallback(() => {
    if (page < TOTAL - 1) {
      pagerRef.current?.setPage(page + 1);
    }
  }, [page]);

  const goBack = useCallback(() => {
    if (page > 0) {
      pagerRef.current?.setPage(page - 1);
    }
  }, [page]);

  const handleSkip = useCallback(async () => {
    await completeOnboarding();
    router.replace('/(tabs)');
  }, [completeOnboarding]);

  const handleComplete = useCallback(async () => {
    // Step3 calls completeOnboarding itself
    router.replace('/(tabs)');
  }, []);

  const isLast = page === TOTAL - 1;
  const isFirst = page === 0;

  return (
    <View style={styles.root}>
      {/* Skip button — top right */}
      <SafeAreaView style={styles.topBar}>
        <View style={styles.topBarInner}>
          <View />
          {!isLast && (
            <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* PagerView */}
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
      >
        <View key="1" style={styles.page}><Step1 /></View>
        <View key="2" style={styles.page}><Step2 /></View>
        <View key="3" style={styles.page}>
          <Step3 onComplete={handleComplete} />
        </View>
      </PagerView>

      {/* Bottom controls */}
      <SafeAreaView style={styles.bottomBar}>
        <View style={styles.bottomInner}>
          {/* Back button */}
          {!isFirst ? (
            <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}

          {/* Dots */}
          <DotIndicators page={page} />

          {/* Next / Get Started */}
          {!isLast ? (
            <TouchableOpacity onPress={goNext} style={styles.nextBtn} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleSkip} style={[styles.nextBtn, styles.getStartedBtn]} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>Get Started →</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
  },
  skipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textSecondary,
  },
  pager: { flex: 1 },
  page: { flex: 1 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[8],
    paddingTop: Spacing[3],
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: FontSize.lg, color: Colors.textSecondary, lineHeight: 22 },
  backBtnPlaceholder: { width: 44 },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[4],
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedBtn: { paddingHorizontal: Spacing[5] },
  nextBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemiBold,
    color: '#FFFFFF',
  },
});
