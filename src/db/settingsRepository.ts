import type { Activity, Tone } from '@/domain/profile';
import { validateGoal } from '@/domain/water';
import { ensureDaysThrough } from './days';
import { createMutex, type Mutex } from './mutex';
import type { Db } from './types';

export interface Settings {
  dailyGoalMl: number;
  glassMl: number;
  remindersEnabled: boolean;
  intervalMin: number;
  wakeMin: number;
  sleepMin: number;
  tone: Tone;
  onboardingDone: boolean;
}

export interface Profile {
  age: number | null;
  weightKg: number | null;
  activity: Activity | null;
}

export interface ReminderPrefs {
  remindersEnabled: boolean;
  intervalMin: number;
  wakeMin: number;
  sleepMin: number;
  tone: Tone;
}

export class SettingsValidationError extends Error {
  constructor(what: string) {
    super(`Geçersiz ayar: ${what}`);
    this.name = 'SettingsValidationError';
  }
}

interface SettingsRow {
  daily_goal_ml: number;
  glass_ml: number;
  reminders_enabled: number;
  interval_min: number;
  wake_min: number;
  sleep_min: number;
  tone: Tone;
  onboarding_done: number;
}
interface ProfileRow {
  age: number | null;
  weight_kg: number | null;
  activity: Activity | null;
}

export interface SettingsRepository {
  load(): Promise<{ settings: Settings; profile: Profile }>;
  /**
   * Günlük hedefi değiştirir: ayarı ve YALNIZCA bugünün hedef anlık görüntüsünü günceller.
   * Önceki günlerin hedefi ve bitki durumu değişmez.
   */
  setDailyGoal(goalMl: number, todayKey: string): Promise<void>;
  setGlassAmount(glassMl: number): Promise<void>;
  saveProfile(profile: Profile): Promise<void>;
  saveReminderPrefs(prefs: ReminderPrefs): Promise<void>;
  /** İlk kurulumu tek işlemde kaydeder; yarım kalırsa hiçbir şey yazılmaz. */
  completeOnboarding(input: {
    goalMl: number;
    glassMl: number;
    profile: Profile;
    reminders: ReminderPrefs;
    todayKey: string;
  }): Promise<void>;
}

function assertGoal(goalMl: number): void {
  if (!validateGoal(goalMl).ok) throw new SettingsValidationError('günlük hedef');
}
function assertGlass(ml: number): void {
  if (!Number.isInteger(ml) || ml < 50 || ml > 2000) throw new SettingsValidationError('bardak miktarı');
}
function assertProfile(p: Profile): void {
  const okInt = (v: number | null, min: number, max: number) => v === null || (Number.isInteger(v) && v >= min && v <= max);
  if (!okInt(p.age, 1, 120)) throw new SettingsValidationError('yaş');
  if (!okInt(p.weightKg, 20, 300)) throw new SettingsValidationError('kilo');
  if (p.activity !== null && !['az', 'orta', 'cok'].includes(p.activity)) throw new SettingsValidationError('aktivite');
}
function assertPrefs(r: ReminderPrefs): void {
  const minute = (v: number) => Number.isInteger(v) && v >= 0 && v <= 1439;
  if (!minute(r.wakeMin) || !minute(r.sleepMin) || r.wakeMin === r.sleepMin) throw new SettingsValidationError('uyanma/uyuma saati');
  if (!Number.isInteger(r.intervalMin) || r.intervalMin < 30 || r.intervalMin > 720) throw new SettingsValidationError('aralık');
  if (r.tone !== 'komik' && r.tone !== 'nazik') throw new SettingsValidationError('mesaj tarzı');
}

export function createSettingsRepository(db: Db, exclusive: Mutex = createMutex()): SettingsRepository {
  async function load() {
    const s = await db.getFirstAsync<SettingsRow>(
      `SELECT daily_goal_ml, glass_ml, reminders_enabled, interval_min, wake_min, sleep_min, tone, onboarding_done
       FROM settings WHERE id = 1`,
    );
    const p = await db.getFirstAsync<ProfileRow>('SELECT age, weight_kg, activity FROM profile WHERE id = 1');
    if (!s || !p) throw new Error('Ayarlar veya profil satırı bulunamadı.');
    return {
      settings: {
        dailyGoalMl: s.daily_goal_ml,
        glassMl: s.glass_ml,
        remindersEnabled: s.reminders_enabled === 1,
        intervalMin: s.interval_min,
        wakeMin: s.wake_min,
        sleepMin: s.sleep_min,
        tone: s.tone,
        onboardingDone: s.onboarding_done === 1,
      },
      profile: { age: p.age, weightKg: p.weight_kg, activity: p.activity },
    };
  }

  const writeGoal = async (goalMl: number, todayKey: string) => {
    await db.runAsync('UPDATE settings SET daily_goal_ml = ? WHERE id = 1', [goalMl]);
    await ensureDaysThrough(db, todayKey);
    await db.runAsync('UPDATE days SET goal_ml = ? WHERE local_date = ?', [goalMl, todayKey]);
  };
  const writeProfile = (p: Profile) =>
    db.runAsync('UPDATE profile SET age = ?, weight_kg = ?, activity = ? WHERE id = 1', [p.age, p.weightKg, p.activity]);
  const writePrefs = (r: ReminderPrefs) =>
    db.runAsync(
      `UPDATE settings SET reminders_enabled = ?, interval_min = ?, wake_min = ?, sleep_min = ?, tone = ? WHERE id = 1`,
      [r.remindersEnabled ? 1 : 0, r.intervalMin, r.wakeMin, r.sleepMin, r.tone],
    );

  return {
    load: () => exclusive(load),

    async setDailyGoal(goalMl, todayKey) {
      assertGoal(goalMl);
      return exclusive(() => db.withTransactionAsync(() => writeGoal(goalMl, todayKey)));
    },

    async setGlassAmount(glassMl) {
      assertGlass(glassMl);
      return exclusive(async () => void (await db.runAsync('UPDATE settings SET glass_ml = ? WHERE id = 1', [glassMl])));
    },

    async saveProfile(profile) {
      assertProfile(profile);
      return exclusive(async () => void (await writeProfile(profile)));
    },

    async saveReminderPrefs(prefs) {
      assertPrefs(prefs);
      return exclusive(async () => void (await writePrefs(prefs)));
    },

    async completeOnboarding({ goalMl, glassMl, profile, reminders, todayKey }) {
      assertGoal(goalMl);
      assertGlass(glassMl);
      assertProfile(profile);
      assertPrefs(reminders);
      return exclusive(() =>
        db.withTransactionAsync(async () => {
          await writeGoal(goalMl, todayKey);
          await db.runAsync('UPDATE settings SET glass_ml = ? WHERE id = 1', [glassMl]);
          await writeProfile(profile);
          await writePrefs(reminders);
          await db.runAsync('UPDATE settings SET onboarding_done = 1 WHERE id = 1');
        }),
      );
    },
  };
}
