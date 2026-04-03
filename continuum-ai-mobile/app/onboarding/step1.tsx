import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { AnimatedBackground } from '../../components/ui/AnimatedBackground';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  FadeInUp,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Ellipse, Path } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing } from '../../constants/theme';

const { width: W } = Dimensions.get('window');
const ILLUSTRATION_SIZE = W * 0.72;

// ─── Pulsing node ─────────────────────────────────────────────────────────────

function PulsingNode({ delay, cx, cy, r = 10 }: { delay: number; cx: number; cy: number; r?: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.25, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1,    { duration: 700, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1,   { duration: 700 }),
          withTiming(0.5, { duration: 700 })
        ),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: cx - r },
      { translateY: cy - r },
      { scaleX: scale.value },
      { scaleY: scale.value },
    ],
    opacity: opacity.value,
    width: r * 2,
    height: r * 2,
    borderRadius: r,
    backgroundColor: Colors.primary,
    position: 'absolute',
  }));

  return <Animated.View style={style} />;
}

// ─── Animated connection line ─────────────────────────────────────────────────

function PulsingLine({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.85, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3,  { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, []);
  return opacity; // returned for use in parent
}

// ─── Illustration ─────────────────────────────────────────────────────────────

const S = ILLUSTRATION_SIZE;
// Node positions (relative to S×S canvas)
const NODES = {
  brain:  { cx: S * 0.5,  cy: S * 0.14 },
  heart:  { cx: S * 0.46, cy: S * 0.42 },
  lungs:  { cx: S * 0.5,  cy: S * 0.55 },
  belly:  { cx: S * 0.5,  cy: S * 0.72 },
};

function BodyIllustration() {
  const lineOpacity = useSharedValue(0.4);
  useEffect(() => {
    lineOpacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const lineStyle = useAnimatedStyle(() => ({ opacity: lineOpacity.value }));

  return (
    <View style={{ width: S, height: S }}>
      {/* SVG silhouette */}
      <Svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
        {/* Body outline — simple geometric human */}
        <Ellipse
          cx={S * 0.5} cy={S * 0.085}
          rx={S * 0.09} ry={S * 0.085}
          fill="none" stroke={Colors.border} strokeWidth={2}
        />
        {/* Neck */}
        <Line x1={S*0.5} y1={S*0.17} x2={S*0.5} y2={S*0.21} stroke={Colors.border} strokeWidth={2} />
        {/* Torso */}
        <Path
          d={`M ${S*0.34} ${S*0.21} Q ${S*0.5} ${S*0.19} ${S*0.66} ${S*0.21} L ${S*0.62} ${S*0.65} Q ${S*0.5} ${S*0.67} ${S*0.38} ${S*0.65} Z`}
          fill="none" stroke={Colors.border} strokeWidth={2}
        />
        {/* Arms */}
        <Path d={`M ${S*0.34} ${S*0.22} Q ${S*0.2} ${S*0.35} ${S*0.22} ${S*0.52}`} fill="none" stroke={Colors.border} strokeWidth={1.5} />
        <Path d={`M ${S*0.66} ${S*0.22} Q ${S*0.8} ${S*0.35} ${S*0.78} ${S*0.52}`} fill="none" stroke={Colors.border} strokeWidth={1.5} />
        {/* Legs */}
        <Path d={`M ${S*0.45} ${S*0.65} L ${S*0.38} ${S*0.9}`} stroke={Colors.border} strokeWidth={1.5} />
        <Path d={`M ${S*0.55} ${S*0.65} L ${S*0.62} ${S*0.9}`} stroke={Colors.border} strokeWidth={1.5} />

        {/* Connection lines between nodes */}
        <Line
          x1={NODES.brain.cx} y1={NODES.brain.cy}
          x2={NODES.heart.cx} y2={NODES.heart.cy}
          stroke={Colors.primary} strokeWidth={1.5} strokeDasharray="4,4"
          opacity={0.5}
        />
        <Line
          x1={NODES.heart.cx} y1={NODES.heart.cy}
          x2={NODES.lungs.cx} y2={NODES.lungs.cy}
          stroke={Colors.primary} strokeWidth={1.5} strokeDasharray="4,4"
          opacity={0.5}
        />
        <Line
          x1={NODES.lungs.cx} y1={NODES.lungs.cy}
          x2={NODES.belly.cx} y2={NODES.belly.cy}
          stroke={Colors.primary} strokeWidth={1.5} strokeDasharray="4,4"
          opacity={0.5}
        />
      </Svg>

      {/* Animated nodes overlay */}
      <View style={StyleSheet.absoluteFill}>
        <PulsingNode delay={0}    cx={NODES.brain.cx}  cy={NODES.brain.cy}  r={9} />
        <PulsingNode delay={350}  cx={NODES.heart.cx}  cy={NODES.heart.cy}  r={11} />
        <PulsingNode delay={700}  cx={NODES.lungs.cx}  cy={NODES.lungs.cy}  r={9} />
        <PulsingNode delay={1050} cx={NODES.belly.cx}  cy={NODES.belly.cy}  r={8} />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function Step1() {
  return (
    <View style={styles.root}>
      <AnimatedBackground />
      <View style={styles.illustrationWrap}>
        <BodyIllustration />
      </View>
      <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.textBlock}>
        <Text style={styles.heading}>
          <Text style={styles.headingWhite}>{'YOUR HEALTH\n'}</Text>
          <Text style={styles.headingElectric}>{'UNDERSTOOD'}</Text>
        </Text>
        <Text style={styles.body}>
          Continuum learns from your health data and tells you what matters — in plain language.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing[6] },
  illustrationWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: Spacing[6] },
  textBlock: { flex: 1, alignItems: 'flex-start', justifyContent: 'flex-start', gap: Spacing[4], paddingBottom: Spacing[4] },
  heading: { fontSize: 42, fontFamily: FontFamily.displayExtraBold, lineHeight: 48, letterSpacing: -1.5 },
  headingWhite: { color: Colors.textPrimary },
  headingElectric: { color: Colors.electric },
  body: { fontSize: FontSize.md, fontFamily: FontFamily.bodyRegular, color: Colors.textSecondary, lineHeight: 24, maxWidth: 300 },
});
