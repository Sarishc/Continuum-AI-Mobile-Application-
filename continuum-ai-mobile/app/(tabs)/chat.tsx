import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing } from '../../constants/theme';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Chat</Text>
        <Text style={styles.subtitle}>Ask anything about your health</Text>
      </View>
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Your AI health companion</Text>
        <Text style={styles.emptyDesc}>
          Start a conversation to get personalised insights, understand your symptoms, or review your health data.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.display,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    gap: Spacing[3],
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
