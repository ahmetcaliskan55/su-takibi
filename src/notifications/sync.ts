import { toLocalDateKey } from '@/domain/date';
import { planReminders, type PlannedReminder } from '@/domain/reminders';
import type { SettingsRepository } from '@/db/settingsRepository';
import type { WaterRepository } from '@/db/waterRepository';
import type { NotificationDriver } from './types';

export type SyncReason = 'disabled' | 'no-permission' | 'scheduled';
export interface SyncResult {
  reason: SyncReason;
  scheduled: number;
}

interface Deps {
  driver: NotificationDriver;
  water: WaterRepository;
  settings: SettingsRepository;
  now?: Date;
}

/** Saf plandaki yerel zamanı verir (sürücüye giden liste). */
export async function buildPlan(deps: Omit<Deps, 'driver'>): Promise<PlannedReminder[]> {
  const now = deps.now ?? new Date();
  const { settings } = await deps.settings.load();
  const todayKey = toLocalDateKey(now);
  const state = await deps.water.reminderState(todayKey);
  const lastLogAt = state.lastLog
    ? (() => {
        const [y, m, d] = state.lastLog.localDate.split('-').map(Number) as [number, number, number];
        return new Date(y, m - 1, d, Math.floor(state.lastLog.minuteOfDay / 60), state.lastLog.minuteOfDay % 60);
      })()
    : null;
  return planReminders({
    now,
    settings: {
      enabled: settings.remindersEnabled,
      intervalMin: settings.intervalMin,
      wakeMin: settings.wakeMin,
      sleepMin: settings.sleepMin,
      tone: settings.tone,
    },
    completedDates: state.completedDates,
    lastLogAt,
  });
}

/**
 * Planı hesaplayıp işletim sistemine uygular: önce hepsini iptal eder, sonra yeni planı oluşturur (tekrarlı bildirim kalmaz).
 * Bildirim kapalıysa, ilk kurulum bitmediyse ya da izin yoksa yalnızca iptal eder; uygulama izinsiz de kullanılabilir.
 */
export async function syncReminders(deps: Deps): Promise<SyncResult> {
  const { driver } = deps;
  const { settings } = await deps.settings.load();
  if (!settings.onboardingDone || !settings.remindersEnabled) {
    await driver.cancelAll();
    return { reason: 'disabled', scheduled: 0 };
  }
  const permission = await driver.getPermission();
  if (permission.state !== 'granted') {
    await driver.cancelAll();
    return { reason: 'no-permission', scheduled: 0 };
  }
  const plan = await buildPlan(deps);
  await driver.ensureChannel();
  await driver.cancelAll();
  const scheduled = await driver.schedule(plan);
  return { reason: 'scheduled', scheduled };
}

/**
 * Eşitlemeleri sıraya koyar: aynı anda tek çalışır; çalışırken gelen istekler tek bir ek çalıştırmaya birleştirilir
 * (iptal/oluştur adımları iç içe girip yinelenen bildirim bırakmasın).
 */
export function createSerialRunner(task: () => Promise<unknown>): () => Promise<void> {
  let running: Promise<void> | null = null;
  let pending = false;

  const loop = async () => {
    do {
      pending = false;
      try {
        await task();
      } catch {
        // Bir sonraki tetikleyicide yeniden denenir.
      }
    } while (pending);
  };

  return () => {
    if (running) {
      pending = true;
      return running;
    }
    running = loop().finally(() => {
      running = null;
    });
    return running;
  };
}
