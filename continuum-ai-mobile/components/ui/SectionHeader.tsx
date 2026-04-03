import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing } from '../../constants/theme';

interface SectionHeaderProps {
  title: string;
  rightAction?: { label: string; onPress: () => void };
  style?: ViewStyle;
}

export function SectionHeader({ title, rightAction, style }: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label}>{title}</Text>
      {rightAction ? (
        <TouchableOpacity
          onPress={rightAction.onPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.action}>{rightAction.label}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.line} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.rim,
  },
  action: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.electric,
  },
});
