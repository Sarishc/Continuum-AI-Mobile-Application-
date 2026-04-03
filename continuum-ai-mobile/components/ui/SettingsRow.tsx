import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Animated as RNAnimated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';

function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18L15 12L9 6"
        stroke={Colors.textMuted}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface SettingsRowProps {
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  labelColor?: string;
  showDivider?: boolean;
  showChevron?: boolean;
  style?: ViewStyle;
  iconBgColor?: string;
}

export function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  rightElement,
  labelColor,
  showDivider = true,
  showChevron = true,
  style,
  iconBgColor,
}: SettingsRowProps) {
  const flashAnim = useRef(new RNAnimated.Value(0)).current;

  const handlePress = () => {
    if (!onPress) return;
    flashAnim.value = 1;
    RNAnimated.sequence([
      RNAnimated.timing(flashAnim, { toValue: 1, duration: 40, useNativeDriver: false }),
      RNAnimated.timing(flashAnim, { toValue: 0, duration: 160, useNativeDriver: false }),
    ]).start();
    onPress();
  };

  const flashBg = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', Colors.electricMist],
  });

  return (
    <RNAnimated.View style={{ backgroundColor: flashBg }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={onPress ? 0.85 : 1}
        style={[styles.row, showDivider && styles.divider, style]}
      >
        {/* Icon container */}
        <View
          style={[
            styles.iconContainer,
            iconBgColor
              ? { backgroundColor: iconBgColor }
              : { backgroundColor: Colors.surface, borderColor: Colors.rim },
          ]}
        >
          <Text style={styles.iconEmoji}>{icon}</Text>
        </View>

        {/* Text */}
        <View style={styles.textBlock}>
          <Text
            style={[
              styles.label,
              labelColor ? { color: labelColor } : null,
            ]}
          >
            {label}
          </Text>
          {sublabel ? (
            <Text style={styles.sublabel}>{sublabel}</Text>
          ) : null}
        </View>

        {/* Right element */}
        <View style={styles.right}>
          {rightElement ?? (showChevron && onPress ? <ChevronRight /> : null)}
        </View>
      </TouchableOpacity>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
    minHeight: 56,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.rim,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconEmoji: {
    fontSize: 16,
    lineHeight: 20,
  },
  textBlock: { flex: 1, gap: 2 },
  label: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.displayMedium,
    color: Colors.textPrimary,
  },
  sublabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
