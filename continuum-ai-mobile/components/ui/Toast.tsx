import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore, type ToastType } from '../../store/toastStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';

const TOAST_CONFIG: Record<ToastType, { color: string; bg: string; border: string; icon: string }> = {
  success: {
    color: Colors.positive,
    bg: Colors.positiveGlow,
    border: 'rgba(0,200,150,0.3)',
    icon: '✓',
  },
  error: {
    color: Colors.critical,
    bg: Colors.criticalGlow,
    border: 'rgba(255,79,107,0.3)',
    icon: '✕',
  },
  info: {
    color: Colors.electric,
    bg: Colors.electricGlow,
    border: 'rgba(79,126,255,0.3)',
    icon: 'i',
  },
  warning: {
    color: Colors.caution,
    bg: Colors.cautionGlow,
    border: 'rgba(255,181,71,0.3)',
    icon: '!',
  },
};

function ToastItem({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: ToastType;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new RNAnimated.Value(-100)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const cfg = TOAST_CONFIG[type];

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.spring(translateY, {
        toValue: 0,
        damping: 20,
        stiffness: 260,
        useNativeDriver: true,
      }),
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const dismiss = () => {
    RNAnimated.parallel([
      RNAnimated.timing(translateY, { toValue: -100, duration: 200, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  return (
    <RNAnimated.View
      style={[
        styles.toast,
        {
          top: insets.top + Spacing[3],
          backgroundColor: Colors.elevated,
          borderColor: cfg.border,
          borderLeftColor: cfg.color,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${cfg.color}20` }]}>
        <Text style={[styles.icon, { color: cfg.color }]}>{cfg.icon}</Text>
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
  return (
    <ToastItem
      key={toast.id}
      message={toast.message}
      type={toast.type}
      onDismiss={hideToast}
    />
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Spacing[4],
    right: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
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
    fontFamily: FontFamily.displaySemiBold,
  },
  message: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.displayMedium,
    color: Colors.textPrimary,
    lineHeight: 19,
  },
});
