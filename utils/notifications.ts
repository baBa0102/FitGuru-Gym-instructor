import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications'; 
import { Platform } from 'react-native';

export async function scheduleWeeklyWeightReminder() {
  // Request permission
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  // Cancel existing
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule weekly notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚖️ Weekly Check-In',
      body: 'Time to log your weight and track your progress!',
    },
    trigger: {
      type: SchedulableTriggerInputTypes.CALENDAR, 
      weekday: 2, 
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });
}