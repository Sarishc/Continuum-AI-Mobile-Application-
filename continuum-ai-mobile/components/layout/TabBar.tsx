import React, { useCallback } from 'react';
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
import { hapticImpact } from '@/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { useInsights } from '../../hooks/useInsights';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHONE_W = Math.min(SCREEN_WIDTH, 430);
const TAB_BAR_HEIGHT = 49;

// ─── SVG Icons (SF Symbols aesthetic) ────────────────────────────────────────

function HomeIcon({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
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
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {filled ? (
        <Path
          d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
          fill={color}
        />
      ) : (
        <Path
          d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

function MedsIcon({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {/* Pill capsule shape */}
      <Path
        d="M9 3C6.239 3 4 5.239 4 8v8c0 2.761 2.239 5 5 5h6c2.761 0 5-2.239 5-5V8c0-2.761-2.239-5-5-5H9z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color + '30' : 'none'}
      />
      <Path
        d="M4 12h16"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {filled && (
        <Path
          d="M4 12C4 9.239 6.239 7 9 7h6c2.761 0 5 2.239 5 5H4z"
          fill={color}
          opacity={0.8}
        />
      )}
    </Svg>
  );
}

function InsightsIcon({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
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
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {filled ? (
        <>
          <Circle cx="12" cy="8" r="4" fill={color} />
          <Path d="M4 20C4 17 7.58172 14 12 14C16.4183 14 20 17 20 20" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </>
      ) : (
        <>
          <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={1.8} />
          <Path d="M4 20C4 17 7.58172 14 12 14C16.4183 14 20 17 20 20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

const TAB_ICONS = [HomeIcon, ChatIcon, MedsIcon, InsightsIcon, ProfileIcon];
const TAB_LABELS = ['Home', 'Chat', 'Meds', 'Insights', 'Profile'];

// ─── Tab Item ─────────────────────────────────────────────────────────────────

interface TabItemProps {
  Icon: React.FC<{ color: string; filled?: boolean }>;
  label: string;
  isFocused: boolean;
  onPress: () => void;
  badge?: number;
}

function TabItem({ Icon, label, isFocused, onPress, badge }: TabItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.82, { damping: 12, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 14, stiffness: 280 });
    });
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const activeColor = Colors.primary;   // #4C8DFF
  const inactiveColor = Colors.textTertiary; // rgba(255,255,255,0.30)
  const iconColor = isFocused ? activeColor : inactiveColor;

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
        <View>
          <Icon color={iconColor} filled={isFocused} />
          {!!badge && badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge > 9 ? '9+' : String(badge)}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, { color: iconColor }]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── TabBar ───────────────────────────────────────────────────────────────────

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useInsights();

  const bottomPad = Math.max(insets.bottom, 0);

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      {/* Top hairline border */}
      <View style={styles.topBorder} />

      {/* Tab row */}
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const Icon = TAB_ICONS[index];
          const label = TAB_LABELS[index];
          const badge = index === 3 ? unreadCount : undefined;
          // Skip hidden tabs (href: null) that don't have a corresponding icon
          if (!Icon) return null;

          const onPress = () => {
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
              badge={badge}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.88)',
    ...Platform.select({
      web: {
        position: 'fixed' as const,
        bottom: 0,
        left: '50%',
        width: PHONE_W,
        transform: [{ translateX: -(PHONE_W / 2) }],
        zIndex: 9999,
      } as any,
      default: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
      },
    }),
  },
  topBorder: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  row: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
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
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.critical,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(8,8,8,0.92)',
  },
  badgeText: {
    fontSize: 9,
    fontFamily: FontFamily.bodyBold,
    color: '#FFFFFF',
    lineHeight: 11,
  },
});
