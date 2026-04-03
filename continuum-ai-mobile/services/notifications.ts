import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect } from 'react';

// ─── Global notification handler ─────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Permission + token registration ─────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null; // won't work in simulator

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

// ─── Local notification scheduler ────────────────────────────────────────────

export async function scheduleLocalNotification(
  title: string,
  body: string,
  seconds: number = 1
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
  } catch {
    // Notifications not available in this environment — fail silently
  }
}

// ─── Foreground notification listener hook ───────────────────────────────────

export function useNotificationListener(
  onReceived?: (notification: Notifications.Notification) => void
) {
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((n) => {
      onReceived?.(n);
    });
    return () => sub.remove();
  }, [onReceived]);
}
