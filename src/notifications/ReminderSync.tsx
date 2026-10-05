import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { msUntilNextLocalMidnight } from '@/domain/date';
import { useSettingsRepository, useWaterRepository } from '@/state/DatabaseProvider';
import { useSettings } from '@/state/SettingsProvider';
import { onReminderSyncRequested } from './events';
import { useNotifications } from './NotificationProvider';
import { createSerialRunner, syncReminders } from './sync';

/**
 * Hatırlatma planını güncel tutar. Şu durumlarda yeniden hesaplayıp işletim sistemine uygular:
 * açılışta, ayarlar (saat/aralık/tarz/hedef/açık-kapalı) değişince, izin değişince, su kaydı eklenince/düzenlenince/silinince/geri alınınca,
 * uygulama öne gelince ve gece yarısında. Hiçbir şey çizmez.
 */
export function ReminderSync() {
  const water = useWaterRepository();
  const settingsRepo = useSettingsRepository();
  const { settings } = useSettings();
  const { driver, permission } = useNotifications();

  const run = useMemo(() => createSerialRunner(() => syncReminders({ driver, water, settings: settingsRepo })), [driver, water, settingsRepo]);

  // Ayarlar ya da izin değişince.
  useEffect(() => {
    void run();
  }, [run, settings, permission?.state]);

  // Veri değişimi, öne gelme ve gece yarısı.
  useEffect(() => {
    const off = onReminderSyncRequested(() => void run());
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void run();
    });
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      timer = setTimeout(() => {
        void run();
        arm();
      }, msUntilNextLocalMidnight(new Date()) + 1000);
    };
    arm();
    return () => {
      off();
      sub.remove();
      clearTimeout(timer);
    };
  }, [run]);

  return null;
}
