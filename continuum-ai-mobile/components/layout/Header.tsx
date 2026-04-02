import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  transparent?: boolean;
}

export function Header({
  title,
  subtitle,
  leftAction,
  rightAction,
  style,
  transparent = false,
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 8 },
        !transparent && styles.solid,
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.side}>{leftAction}</View>
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={[styles.side, styles.rightSide]}>{rightAction}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  solid: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
