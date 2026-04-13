import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { MedicationSchedule } from './firestoreService';

export async function scheduleMedicationReminders(
  schedules: MedicationSchedule[]
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await cancelAllMedicationNotifications();

    for (const schedule of schedules) {
      if (!schedule.isActive || !schedule.notificationsEnabled) continue;

      for (const time of schedule.times) {
        const [hours, minutes] = time.split(':').map(Number);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 Time for ${schedule.medicationName}`,
            body: `${schedule.dosage} — Tap to log`,
            sound: true,
            data: {
              type: 'medication_reminder',
              scheduleId: schedule.id,
              medicationName: schedule.medicationName,
              dosage: schedule.dosage,
              scheduledTime: time,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hours,
            minute: minutes,
          },
        });
      }
    }
  } catch {
    // Fail silently — may be simulator or missing permissions
  }
}

export async function cancelAllMedicationNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const medNotifs = scheduled.filter(
      (n) => (n.content.data as Record<string, unknown>)?.type === 'medication_reminder'
    );
    await Promise.all(
      medNotifs.map((n) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier)
      )
    );
  } catch {
    // Fail silently
  }
}

export async function sendMissedMedicationAlert(
  medicationName: string,
  scheduledTime: string
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⚠️ Missed: ${medicationName}`,
        body: `You missed your ${scheduledTime} dose. Log it now.`,
        sound: true,
        data: {
          type: 'missed_medication',
          medicationName,
          scheduledTime,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
      },
    });
  } catch {
    // Fail silently
  }
}
