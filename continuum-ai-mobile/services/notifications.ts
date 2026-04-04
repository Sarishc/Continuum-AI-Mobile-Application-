import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import apiClient from '../api/client';

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
  if (!Device.isDevice) return null;

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

// ─── Register + sync push token to backend ───────────────────────────────────

export async function registerAndSyncPushToken(): Promise<string | null> {
  const token = await registerForPushNotifications();
  if (!token) return null;
  try {
    await apiClient.post('/users/push-token', {
      token,
      platform: Platform.OS,
    });
  } catch {
    // Non-critical — token will sync on next successful registration
  }
  return token;
}

// ─── Local notification scheduler ────────────────────────────────────────────

export async function scheduleLocalNotification(
  title: string,
  body: string,
  seconds: number = 1,
  data?: Record<string, string>
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, data: data ?? {} },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
  } catch {
    // Fail silently — simulator / no permission
  }
}

// ─── Foreground notification listener ────────────────────────────────────────

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

// ─── Notification tap → deep link ─────────────────────────────────────────────

export function useNotificationTap() {
  const router = useRouter();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | Record<string, string>
        | undefined;
      const type = data?.type;
      const screen = data?.screen;

      // Named types get priority routing
      if (type === 'weekly_brief') {
        setTimeout(() => router.push('/weekly-brief' as any), 300);
        return;
      }
      if (screen) {
        setTimeout(() => {
          router.push(screen as Parameters<typeof router.push>[0]);
        }, 300);
      }
    });
    return () => sub.remove();
  }, [router]);
}

// ─── Weekly brief scheduling ──────────────────────────────────────────────────

export async function scheduleWeeklyBrief(): Promise<void> {
  try {
    // Cancel any existing weekly brief notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existing = scheduled.filter(
      (n) => (n.content.data as Record<string, unknown>)?.type === 'weekly_brief'
    );
    for (const notif of existing) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }

    // Schedule for every Sunday at 9:00 AM local time
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 Your Weekly Health Brief is Ready',
        body: 'See how your health trended this week and what to focus on.',
        sound: true,
        data: {
          type: 'weekly_brief',
          screen: '/weekly-brief',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday
        hour: 9,
        minute: 0,
      },
    });
  } catch {
    // Fail silently — simulator doesn't support calendar triggers
  }
}

export async function cancelWeeklyBrief(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existing = scheduled.filter(
      (n) => (n.content.data as Record<string, unknown>)?.type === 'weekly_brief'
    );
    for (const notif of existing) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  } catch {
    // Fail silently
  }
}
