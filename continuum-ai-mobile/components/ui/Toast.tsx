import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore, type ToastType } from '../../store/toastStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOAST_CONFIG: Record<ToastType, { color: string; bg: string; icon: string }> = {
  success: { color: Colors.accent,   bg: 'rgba(63,185,80,0.12)',   icon: '✓' },
  error:   { color: Colors.critical, bg: 'rgba(248,81,73,0.12)',   icon: '✕' },
  info:    { color: Colors.primary,  bg: 'rgba(56,139,253,0.12)',  icon: 'ℹ' },
  warning: { color: Colors.warning,  bg: 'rgba(210,153,34,0.12)', icon: '⚠' },
};

function ToastItem({ message, type, onDismiss }: {
  message: string;
  type: ToastType;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new RNAnimated.Value(-80)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const config = TOAST_CONFIG[type];

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.spring(translateY, { toValue: 0, damping: 18, stiffness: 220, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = () => {
    RNAnimated.parallel([
      RNAnimated.timing(translateY, { toValue: -80, duration: 220, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  return (
    <RNAnimated.View
      style={[
        styles.toast,
        {
          top: insets.top + Spacing[3],
          backgroundColor: config.bg,
          borderLeftColor: config.color,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${config.color}22` }]}>
        <Text style={[styles.icon, { color: config.color }]}>{config.icon}</Text>
      </View>
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
    </RNAnimated.View>
  );
}

export function Toast() {
  const { toast, hideToast } = useToastStore();
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeId = useRef<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    activeId.current = toast.id;
    dismissTimer.current = setTimeout(() => {
      if (activeId.current === toast.id) hideToast();
    }, toast.duration);
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [toast?.id]);

  if (!toast) return null;
  return <ToastItem key={toast.id} message={toast.message} type={toast.type} onDismiss={hideToast} />;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Spacing[4],
    right: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: 'rgba(56,139,253,0.12)',
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    zIndex: 9999,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 10,
    },
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    fontSize: 13,
    fontFamily: FontFamily.bodySemiBold,
  },
  message: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textPrimary,
    lineHeight: 19,
  },
});
