import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { BorderRadius, Shadow } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  noPadding?: boolean;
}

export function Card({ children, style, elevated = false, noPadding = false }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated ? styles.elevated : styles.base,
        !noPadding && styles.padding,
        Shadow.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  base: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  elevated: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
  },
  padding: {
    padding: 16,
  },
});
