import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function hapticImpact(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(style);
}

export function hapticNotification(type: Haptics.NotificationFeedbackType) {
  if (Platform.OS === 'web') return;
  void Haptics.notificationAsync(type);
}
