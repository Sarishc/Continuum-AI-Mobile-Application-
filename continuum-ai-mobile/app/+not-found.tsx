import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { Spacing, BorderRadius } from '../constants/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.code}>404</Text>
      <Text style={styles.title}>Page not found</Text>
      <Text style={styles.sub}>This screen doesn't exist.</Text>
      <TouchableOpacity
        onPress={() => router.replace('/(tabs)')}
        activeOpacity={0.85}
        style={styles.btn}
      >
        <Text style={styles.btnText}>Go Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    padding: Spacing[8],
  },
  code: {
    fontSize: 64,
    fontFamily: FontFamily.display,
    color: Colors.textMuted,
    lineHeight: 72,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.display,
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  btn: {
    marginTop: Spacing[4],
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[6],
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: '#FFFFFF',
  },
});
