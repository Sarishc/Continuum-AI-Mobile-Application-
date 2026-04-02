import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';

// ─── Tab Icons ────────────────────────────────────────────────────────────────

function HomeIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChatIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TimelineIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C12 2 12 8 12 12C12 16 12 22 12 22"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx="12" cy="6" r="2.5" stroke={color} strokeWidth={1.8} />
      <Circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth={1.8} />
      <Circle cx="12" cy="18" r="2.5" stroke={color} strokeWidth={1.8} />
      <Path d="M14.5 6H19" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M9.5 12H5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M14.5 18H19" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function InsightsIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H15M12 3C8.5 3 6 5.5 6 9C6 11.5 7.5 13.5 9.5 14.5V17H14.5V14.5C16.5 13.5 18 11.5 18 9C18 5.5 15.5 3 12 3Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ProfileIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={1.8} />
      <Path
        d="M4 20C4 17 7.58172 14 12 14C16.4183 14 20 17 20 20"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const TAB_ICONS = [HomeIcon, ChatIcon, TimelineIcon, InsightsIcon, ProfileIcon];
const TAB_LABELS = ['Home', 'Chat', 'Timeline', 'Insights', 'Profile'];

// ─── Individual Tab Item ──────────────────────────────────────────────────────

interface TabItemProps {
  icon: React.FC<{ color: string; size?: number }>;
  label: string;
  isFocused: boolean;
  onPress: () => void;
}

function TabItem({ icon: Icon, label, isFocused, onPress }: TabItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.85, { damping: 10, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 250 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const color = isFocused ? Colors.primary : Colors.textMuted;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      style={styles.tabItem}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <View
          style={[
            styles.iconContainer,
            isFocused && styles.iconContainerActive,
          ]}
        >
          <Icon color={color} size={20} />
        </View>
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

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const Icon = TAB_ICONS[index];
          const label = TAB_LABELS[index];

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
              icon={Icon}
              label={label}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
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
  pill: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    // subtle highlight handled via tab pill
  },
  tabLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.primary,
  },
});
