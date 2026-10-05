import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import type { NotificationDriver, PermissionInfo } from './types';

export const CHANNEL_ID = 'water-reminders';

// Uygulama açıkken gelen bildirim de görünsün (sessiz).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function toInfo(s: Notifications.NotificationPermissionsStatus): PermissionInfo {
  return {
    state: s.granted ? 'granted' : s.status === Notifications.PermissionStatus.UNDETERMINED ? 'undetermined' : 'denied',
    canAskAgain: s.canAskAgain,
  };
}

/** `expo-notifications` ile yerel bildirim sürücüsü. Yalnızca bu dosya `expo-notifications` içe aktarır. */
export const expoDriver: NotificationDriver = {
  async ensureChannel() {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Su hatırlatmaları',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
    });
  },

  async getPermission() {
    return toInfo(await Notifications.getPermissionsAsync());
  },

  async requestPermission() {
    await expoDriver.ensureChannel(); // Android 13+: kanal, izin penceresinden önce var olmalı
    return toInfo(await Notifications.requestPermissionsAsync());
  },

  cancelAll: () => Notifications.cancelAllScheduledNotificationsAsync(),

  async schedule(items) {
    let n = 0;
    for (const item of items) {
      await Notifications.scheduleNotificationAsync({
        identifier: item.id,
        content: { title: item.title, body: item.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.fireAt, channelId: CHANNEL_ID },
      });
      n += 1;
    }
    return n;
  },

  openSystemSettings: () => Linking.openSettings(),
};
