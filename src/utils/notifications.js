import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getSettings, updateSettings } from './storage';

// Web reminder interval storage
let _webReminderInterval = null;

// Configure notification behavior (native only)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Request notification permissions
export const requestNotificationPermissions = async () => {
  // Web: use browser Notification API
  if (Platform.OS === 'web') {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  // Native: use expo-notifications
  if (!Device.isDevice) {
    console.log('Notifications require a physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission not granted for notifications');
    return false;
  }

  // Set up Android notification channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminder', {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });
    await Notifications.setNotificationChannelAsync('daily-news', {
      name: 'Daily News Update',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2A7DEB',
    });
  }

  return true;
};

// Schedule daily reminder
export const scheduleDailyReminder = async (hour = 9, minute = 0) => {
  try {
    // Cancel existing reminders first
    await cancelAllReminders();

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;

    if (Platform.OS === 'web') {
      // Web: use setInterval to check time and fire browser notification
      _webReminderInterval = setInterval(() => {
        const now = new Date();
        if (now.getHours() === hour && now.getMinutes() === minute) {
          new Notification('📚 Time to Study!', {
            body: "Don't break your streak! Take a quick test today.",
            icon: '/favicon.ico',
          });
        }
      }, 60000); // Check every minute

      await updateSettings({
        reminderEnabled: true,
        reminderTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        notificationId: 'web-interval',
      });

      console.log(`[Web] Daily reminder scheduled for ${hour}:${minute.toString().padStart(2, '0')}`);
      return true;
    }

    // Native: use expo-notifications
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📚 Time to Study!',
        body: "Don't break your streak! Take a quick test today.",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { screen: 'Home' },
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });

    // Update settings
    await updateSettings({
      reminderEnabled: true,
      reminderTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      notificationId: identifier,
    });

    console.log('Daily reminder scheduled:', identifier);
    return true;
  } catch (error) {
    console.error('Error scheduling reminder:', error);
    return false;
  }
};

// Schedule daily 8 AM news notification
export const scheduleNewsNotification = async () => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;

    // Cancel any existing news notifications first
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === 'daily-news') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Today\'s News is Ready',
        body: 'Read The Hindu headlines with UPSC analysis for today.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'daily-news', screen: 'Articles' },
        channelId: 'daily-news',
      },
      trigger: {
        hour: 8,
        minute: 0,
        repeats: true,
      },
    });

    console.log('[News] Daily 8 AM notification scheduled');
    return true;
  } catch (error) {
    console.error('[News] Error scheduling news notification:', error);
    return false;
  }
};

// Cancel all scheduled reminders
export const cancelAllReminders = async () => {
  try {
    if (Platform.OS === 'web') {
      if (_webReminderInterval) {
        clearInterval(_webReminderInterval);
        _webReminderInterval = null;
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    await updateSettings({ reminderEnabled: false, notificationId: null });
    return true;
  } catch (error) {
    console.error('Error canceling reminders:', error);
    return false;
  }
};

// Get all scheduled notifications
export const getScheduledNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};

// Send immediate notification (for testing)
export const sendTestNotification = async () => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 Notifications Working!',
        body: 'You will receive daily reminders to study.',
        sound: true,
      },
      trigger: null, // Immediate
    });

    return true;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
};

// Motivational messages for notifications
export const motivationalMessages = [
  { title: '📚 Time to Study!', body: "Don't break your streak! Take a quick test today." },
  { title: '🔥 Keep the Fire Burning!', body: 'Your daily practice awaits. Stay consistent!' },
  { title: '🎯 Focus on Your Goal!', body: 'UPSC success comes one question at a time.' },
  { title: '💪 You Got This!', body: 'A few minutes of practice makes a big difference.' },
  { title: '📖 Knowledge Awaits!', body: 'Start your day with a quick revision.' },
  { title: '🏆 Champions Practice Daily!', body: 'Keep your preparation on track.' },
];

// Get random motivational message
export const getRandomMotivation = () => {
  const index = Math.floor(Math.random() * motivationalMessages.length);
  return motivationalMessages[index];
};

