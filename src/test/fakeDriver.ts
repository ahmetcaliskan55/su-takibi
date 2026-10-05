import type { PlannedReminder } from '@/domain/reminders';
import type { NotificationDriver, PermissionInfo } from '@/notifications/types';

export interface FakeDriver extends NotificationDriver {
  /** Çağrı sırası: 'channel' | 'get' | 'request' | 'cancel' | 'schedule:N' | 'settings' */
  calls: string[];
  /** Şu an "işletim sisteminde" planlı olanlar (cancelAll boşaltır). */
  scheduled: PlannedReminder[];
  setPermission(p: PermissionInfo): void;
  /** `requestPermission` bu sonucu verir (varsayılan: izin verildi). */
  setRequestResult(p: PermissionInfo): void;
}

const GRANTED: PermissionInfo = { state: 'granted', canAskAgain: true };

/** Testler için bellek içi bildirim sürücüsü. */
export function createFakeDriver(initial: PermissionInfo = { state: 'granted', canAskAgain: true }): FakeDriver {
  let permission = initial;
  let requestResult: PermissionInfo = GRANTED;
  const driver: FakeDriver = {
    calls: [],
    scheduled: [],
    setPermission(p) {
      permission = p;
    },
    setRequestResult(p) {
      requestResult = p;
    },
    async ensureChannel() {
      driver.calls.push('channel');
    },
    async getPermission() {
      driver.calls.push('get');
      return permission;
    },
    async requestPermission() {
      driver.calls.push('request');
      permission = requestResult;
      return permission;
    },
    async cancelAll() {
      driver.calls.push('cancel');
      driver.scheduled = [];
    },
    async schedule(items) {
      driver.calls.push(`schedule:${items.length}`);
      driver.scheduled = [...driver.scheduled, ...items];
      return items.length;
    },
    async openSystemSettings() {
      driver.calls.push('settings');
    },
  };
  return driver;
}
