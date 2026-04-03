import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

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
      const screen = data?.screen;
      if (screen) {
        // Small delay so navigation is ready after cold start
        setTimeout(() => {
          router.push(screen as Parameters<typeof router.push>[0]);
        }, 300);
      }
    });
    return () => sub.remove();
  }, [router]);
}
