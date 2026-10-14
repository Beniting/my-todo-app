import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { formatTime } from '@/utils/date';

/**
 * Expo Go on Android removed native push notification functionality starting in SDK 53.
 * Full native push and local notifications are active in standalone production builds (`eas build`).
 */
export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let notificationsModule: typeof import('expo-notifications') | null = null;
let isModuleChecked = false;

function getNotificationsModule() {
  if (isModuleChecked) return notificationsModule;
  isModuleChecked = true;

  // Prevent crash in Expo Go on Android or Web
  if (Platform.OS === 'web' || (Platform.OS === 'android' && isExpoGo)) {
    return null;
  }

  try {
    // Dynamic require so top-level evaluation doesn't crash Expo Go on Android
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications');
    notificationsModule?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      notificationsModule?.setNotificationChannelAsync('default', {
        name: 'Task Reminders',
        importance: notificationsModule.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: 'default',
      });
    }
  } catch (err) {
    console.warn('expo-notifications is not available in this environment:', err);
    notificationsModule = null;
  }

  return notificationsModule;
}

export interface ScheduledRemindersResult {
  startNotificationId: string | null;
  dueNotificationId: string | null;
}

export class ReminderService {
  /**
   * Check if native scheduled notifications are supported in current environment
   */
  static isSupported(): boolean {
    return Platform.OS !== 'web' && !(Platform.OS === 'android' && isExpoGo);
  }

  /**
   * Request push/local notification permission from user
   */
  static async requestPermissions(): Promise<boolean> {
    const notifications = getNotificationsModule();
    if (!notifications) return false;

    try {
      const { status: existingStatus } = await notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (err) {
      console.warn('Failed to request notification permission:', err);
      return false;
    }
  }

  /**
   * Registers for push notifications and returns the device/Expo push token
   */
  static async registerForPushNotificationsAsync(): Promise<string | null> {
    const notifications = getNotificationsModule();
    if (!notifications) return null;

    try {
      if (Platform.OS === 'android') {
        await notifications.setNotificationChannelAsync('default', {
          name: 'Task Reminders',
          importance: notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2563EB',
          sound: 'default',
        });
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) return null;

      const tokenData = await notifications.getExpoPushTokenAsync({ projectId });
      return tokenData.data ?? null;
    } catch (err) {
      console.warn('Failed to register for push notifications:', err);
      return null;
    }
  }

  /**
   * Cancels previously scheduled notifications by ID
   */
  static async cancelReminders(notificationIds: (string | null | undefined)[]): Promise<void> {
    const notifications = getNotificationsModule();
    if (!notifications) return;

    for (const id of notificationIds) {
      if (id) {
        try {
          await notifications.cancelScheduledNotificationAsync(id);
        } catch (err) {
          console.warn(`Failed to cancel notification ${id}:`, err);
        }
      }
    }
  }

  /**
   * Schedules two notifications for a task:
   * 1. Exactly at the start time
   * 2. 15 minutes before the due time (or at due time if less than 15 mins away)
   */
  static async scheduleTaskReminders(task: {
    id: string;
    title: string;
    start_at?: string | null;
    due_at?: string | null;
    status: string;
    existingStartNotificationId?: string | null;
    existingDueNotificationId?: string | null;
  }): Promise<ScheduledRemindersResult> {
    const notifications = getNotificationsModule();

    // Cancel old notifications first if module is available
    if (notifications) {
      await this.cancelReminders([
        task.existingStartNotificationId,
        task.existingDueNotificationId,
      ]);
    }

    // If notifications aren't supported (e.g. Expo Go on Android) or task is completed, return gracefully
    if (!notifications || task.status === 'completed') {
      return { startNotificationId: null, dueNotificationId: null };
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return { startNotificationId: null, dueNotificationId: null };
    }

    let startNotificationId: string | null = null;
    let dueNotificationId: string | null = null;
    const now = Date.now();

    // 1. Notification at START TIME
    if (task.start_at) {
      const startDate = new Date(task.start_at);
      if (!isNaN(startDate.getTime()) && startDate.getTime() > now) {
        try {
          const bodyText = task.due_at
            ? `Planned session: ${formatTime(task.start_at)} – ${formatTime(task.due_at)}`
            : `Time to start your scheduled task (${formatTime(task.start_at)})`;

          startNotificationId = await notifications.scheduleNotificationAsync({
            content: {
              title: `🚀 Time to Start: ${task.title}`,
              body: bodyText,
              data: { taskId: task.id, type: 'start' },
              sound: true,
            },
            trigger: {
              type: notifications.SchedulableTriggerInputTypes.DATE,
              date: startDate,
              channelId: 'default',
            },
          });
        } catch (err) {
          console.warn('Failed to schedule start notification:', err);
        }
      }
    }

    // 2. Notification when DUE TIME IS GETTING NEAR
    if (task.due_at) {
      const dueDate = new Date(task.due_at);
      if (!isNaN(dueDate.getTime())) {
        const leadMinutes = 15;
        const warningTime = dueDate.getTime() - leadMinutes * 60 * 1000;

        // If warning time is in the future, alert 15 mins prior
        if (warningTime > now) {
          try {
            dueNotificationId = await notifications.scheduleNotificationAsync({
              content: {
                title: `⏳ Deadline Approaching: ${task.title}`,
                body: `Due in ${leadMinutes} minutes (at ${formatTime(task.due_at)})`,
                data: { taskId: task.id, type: 'due_approaching' },
                sound: true,
              },
              trigger: {
                type: notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(warningTime),
                channelId: 'default',
              },
            });
          } catch (err) {
            console.warn('Failed to schedule approaching-due notification:', err);
          }
        } else if (dueDate.getTime() > now + 60 * 1000) {
          // If within the last 15 mins, schedule alert at the actual due time
          try {
            dueNotificationId = await notifications.scheduleNotificationAsync({
              content: {
                title: `⚠️ Task Due: ${task.title}`,
                body: `Scheduled deadline has arrived (${formatTime(task.due_at)})`,
                data: { taskId: task.id, type: 'due_now' },
                sound: true,
              },
              trigger: {
                type: notifications.SchedulableTriggerInputTypes.DATE,
                date: dueDate,
                channelId: 'default',
              },
            });
          } catch (err) {
            console.warn('Failed to schedule due notification:', err);
          }
        }
      }
    }

    return { startNotificationId, dueNotificationId };
  }
}
