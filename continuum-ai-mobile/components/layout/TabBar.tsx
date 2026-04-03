import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH - 32;
const BAR_HEIGHT = 64;
const TAB_COUNT = 5;
const INDICATOR_SIZE = 40;
const TAB_WIDTH = BAR_WIDTH / TAB_COUNT;

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function HomeIcon({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {filled ? (
        <Path
          d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
          fill={color}
        />
      ) : (
        <Path
          d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

function ChatIcon({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {filled ? (
        <>
          <Path
            d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
            fill={color}
          />
          <Path d="M8 9L8.5 7.5L9 9L10.5 9.5L9 10L8.5 11.5L8 10L6.5 9.5L8 9Z" fill="#fff" opacity={0.9} />
        </>
      ) : (
        <>
          <Path
            d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M8.5 8L9 6.5L9.5 8L11 8.5L9.5 9L9 10.5L8.5 9L7 8.5L8.5 8Z" stroke={color} strokeWidth={1} strokeLinejoin="round" />
        </>
      )}
    </Svg>
  );
}

function TimelineIcon({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4V20"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Circle cx="12" cy="6" r={filled ? 3 : 2.5} fill={filled ? color : 'none'} stroke={color} strokeWidth={1.8} />
      <Circle cx="12" cy="12" r={filled ? 3 : 2.5} fill={filled ? color : 'none'} stroke={color} strokeWidth={1.8} />
      <Circle cx="12" cy="18" r={filled ? 3 : 2.5} fill={filled ? color : 'none'} stroke={color} strokeWidth={1.8} />
      <Path d="M15 6H19" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M9 12H5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M15 18H19" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function InsightsIcon({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {filled ? (
        <Path
          d="M13 2L4.5 13.5H11L10 22L20.5 10H14L13 2Z"
          fill={color}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <Path
          d="M13 2L4.5 13.5H11L10 22L20.5 10H14L13 2Z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

function ProfileIcon({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {filled ? (
        <>
          <Circle cx="12" cy="8" r="4" fill={color} />
          <Path
            d="M4 20C4 17 7.58172 14 12 14C16.4183 14 20 17 20 20"
            stroke={color}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={1.8} />
          <Path
            d="M4 20C4 17 7.58172 14 12 14C16.4183 14 20 17 20 20"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </>
      )}
    </Svg>
  );
}

const TAB_ICONS = [HomeIcon, ChatIcon, TimelineIcon, InsightsIcon, ProfileIcon];
const TAB_LABELS = ['Home', 'Chat', 'Timeline', 'Insights', 'Profile'];

// ─── Tab Item ─────────────────────────────────────────────────────────────────

interface TabItemProps {
  Icon: React.FC<{ color: string; filled?: boolean }>;
  label: string;
  isFocused: boolean;
  onPress: () => void;
}

function TabItem({ Icon, label, isFocused, onPress }: TabItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.82, { damping: 12, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 14, stiffness: 300 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const iconColor = isFocused ? Colors.electric : Colors.textMuted;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      style={styles.tabItem}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <Icon color={iconColor} filled={isFocused} />
        {isFocused && (
          <Text style={styles.tabLabel}>{label}</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── TabBar ───────────────────────────────────────────────────────────────────

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const indicatorX = useSharedValue(state.index * TAB_WIDTH + (TAB_WIDTH - INDICATOR_SIZE) / 2);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 12) },
      ]}
      pointerEvents="box-none"
    >
      {/* Outer shadow wrapper */}
      <View style={styles.shadowWrap}>
        <View style={styles.pill}>
          {/* Sliding active indicator */}
          <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none" />

          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const Icon = TAB_ICONS[index];
            const label = TAB_LABELS[index];

            const onPress = () => {
              indicatorX.value = withSpring(
                index * TAB_WIDTH + (TAB_WIDTH - INDICATOR_SIZE) / 2,
                { damping: 20, stiffness: 300 }
              );
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TabItem
                key={route.key}
                Icon={Icon}
                label={label}
                isFocused={isFocused}
                onPress={onPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    pointerEvents: 'box-none',
  } as any,
  shadowWrap: {
    borderRadius: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: Colors.elevated,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: Colors.rim,
    height: BAR_HEIGHT,
    alignItems: 'center',
    overflow: 'hidden',
    // Top highlight line
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  indicator: {
    position: 'absolute',
    top: (BAR_HEIGHT - INDICATOR_SIZE) / 2,
    left: 0,
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: 14,
    backgroundColor: Colors.electricMist,
    borderWidth: 1,
    borderColor: 'rgba(79,126,255,0.2)',
  },
  tabItem: {
    width: TAB_WIDTH,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: FontFamily.displayMedium,
    color: Colors.electric,
    letterSpacing: 0.2,
  },
});
