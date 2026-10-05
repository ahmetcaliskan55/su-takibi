import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { requestReminderSync } from './events';
import type { NotificationDriver, PermissionInfo } from './types';

interface Value {
  driver: NotificationDriver;
  /** Henüz okunmadıysa `null`. */
  permission: PermissionInfo | null;
  /** İşletim sistemi izin penceresini gösterir; sonucu döndürür ve planı yeniler. */
  requestPermission: () => Promise<PermissionInfo | null>;
  openSystemSettings: () => Promise<void>;
}

const Ctx = createContext<Value | null>(null);

export function useNotifications(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNotifications, NotificationProvider dışında kullanıldı.');
  return v;
}

/** Bildirim izni durumunu tutar; uygulama öne gelince (kullanıcı sistem ayarından değiştirmiş olabilir) yeniden okur. */
export function NotificationProvider({ driver, children }: { driver: NotificationDriver; children: ReactNode }) {
  const [permission, setPermission] = useState<PermissionInfo | null>(null);

  const refresh = useCallback(async () => {
    try {
      setPermission(await driver.getPermission());
    } catch {
      // izin okunamazsa bildirim yokmuş gibi davranılır; uygulama kullanılabilir kalır
    }
  }, [driver]);

  useEffect(() => {
    let cancelled = false;
    driver.getPermission().then(
      (p) => {
        if (!cancelled) setPermission(p);
      },
      () => undefined, // okunamazsa uygulama kullanılabilir kalır
    );
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [driver, refresh]);

  const requestPermission = useCallback(async () => {
    try {
      const info = await driver.requestPermission();
      setPermission(info);
      requestReminderSync();
      return info;
    } catch {
      return null;
    }
  }, [driver]);

  const value = useMemo<Value>(
    () => ({ driver, permission, requestPermission, openSystemSettings: () => driver.openSystemSettings() }),
    [driver, permission, requestPermission],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
