import { formatMinuteOfDay } from './date';
import { FORM_MESSAGES, parseTimeInput } from './logForm';
import { MAX_GOAL_ML, MIN_GOAL_ML } from './water';

export type Activity = 'az' | 'orta' | 'cok';
export const ACTIVITIES: readonly { id: Activity; label: string }[] = [
  { id: 'az', label: 'Az' },
  { id: 'orta', label: 'Orta' },
  { id: 'cok', label: 'Çok' },
];

/** Bardak/şişe seçenekleri (ml). */
export const GLASS_OPTIONS_ML = [150, 200, 250, 330, 500] as const;
/** Hatırlatma aralığı seçenekleri (dakika). Varsayılan 2 saat. */
export const INTERVAL_OPTIONS_MIN = [60, 120, 180, 240] as const;
export const DEFAULT_INTERVAL_MIN = 120;

export type Tone = 'komik' | 'nazik';
export const TONES: readonly { id: Tone; label: string }[] = [
  { id: 'nazik', label: 'Nazik' },
  { id: 'komik', label: 'Komik' },
];

export const GOAL_STEP_ML = 100;

/** Hedefi ±100 ml değiştirir; 500–4.000 ml aralığında kalır. */
export function stepGoal(goalMl: number, direction: 1 | -1): number {
  return Math.min(MAX_GOAL_ML, Math.max(MIN_GOAL_ML, goalMl + direction * GOAL_STEP_ML));
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

export const PROFILE_MESSAGES = {
  age: 'Yaşı 1–120 arasında, rakamla gir.',
  weight: 'Kiloyu 20–300 kg arasında, rakamla gir.',
  sameTimes: 'Uyanma ve uyuma saati aynı olamaz.',
} as const;

function optionalInt(text: string, min: number, max: number, message: string): Parsed<number | null> {
  const t = text.trim();
  if (t === '') return { ok: true, value: null }; // boş bırakılabilir; zorunlu değil
  if (!/^\d+$/.test(t)) return { ok: false, message };
  const n = Number(t);
  return n >= min && n <= max ? { ok: true, value: n } : { ok: false, message };
}

export const parseAge = (text: string) => optionalInt(text, 1, 120, PROFILE_MESSAGES.age);
export const parseWeight = (text: string) => optionalInt(text, 20, 300, PROFILE_MESSAGES.weight);

/**
 * Uyanma/uyuma saatleri. Uyuma saati uyanmadan önce olabilir (ör. 08:00–01:00: gece yarısını aşan uyanıklık);
 * yalnızca ikisi aynı olamaz.
 */
export function parseWakeSleep(
  wakeText: string,
  sleepText: string,
): Parsed<{ wakeMin: number; sleepMin: number }> {
  const wakeMin = parseTimeInput(wakeText);
  const sleepMin = parseTimeInput(sleepText);
  if (wakeMin === null || sleepMin === null) return { ok: false, message: FORM_MESSAGES.timeFormat };
  if (wakeMin === sleepMin) return { ok: false, message: PROFILE_MESSAGES.sameTimes };
  return { ok: true, value: { wakeMin, sleepMin } };
}

export const GLASS_MESSAGE = 'Miktarı 50 ile 2.000 ml arasında rakamla gir.';

/** Özel bardak/şişe miktarı: 50–2.000 ml tam sayı. */
export function parseGlassAmount(text: string): Parsed<number> {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return { ok: false, message: t === '' ? 'Önce bir miktar gir.' : GLASS_MESSAGE };
  const n = Number(t);
  return n >= 50 && n <= 2000 ? { ok: true, value: n } : { ok: false, message: GLASS_MESSAGE };
}

/**
 * Hatırlatma saatleri metni: uyanma → uyuma arası hatırlatma gelir, uyuma → uyanma arası sessiz kalır.
 * Uyuma saati uyanmadan önceyse aralık gece yarısını aşar.
 * Örn. uyanma 08:00, uyuma 01:00 → "Hatırlatmalar 08.00 – 01.00 arasında gelir (gece yarısını aşar). 01.00 – 08.00 arasında sessiz kalır."
 */
export function reminderWindowText(wakeMin: number, sleepMin: number): string {
  const wake = formatMinuteOfDay(wakeMin);
  const sleep = formatMinuteOfDay(sleepMin);
  const crosses = sleepMin < wakeMin ? ' (gece yarısını aşar)' : '';
  return `Hatırlatmalar ${wake} – ${sleep} arasında gelir${crosses}. ${sleep} – ${wake} arasında sessiz kalır.`;
}
