import { addDaysToKey, parseDateKey, toLocalDateKey } from './date';
import { MESSAGES } from './messages';
import type { Tone } from './profile';

/**
 * Hatırlatma planlayıcısı: SAF fonksiyon. İşletim sistemine dokunmaz (bildirim oluşturma/iptal `src/notifications/` altındadır);
 * yalnızca "hangi zamanda hangi mesaj" listesini hesaplar.
 *
 * Kurallar:
 *  - Hatırlatma yalnızca uyanık saatlerde gelir: uyanma → uyuma (uyuma saati uyanmadan önceyse gece yarısını aşar, ör. 08:00–01:00).
 *  - Bir uyanıklık penceresi, o takvim günü hedef tamamlandıysa tamamen susar (gece yarısını aşan kuyruk dahil). Sonraki günler etkilenmez.
 *  - Son su kaydından (kayıt yoksa uyanma saatinden) itibaren her `aralık` dakikada bir; seviye = 1, 2, 3, 4 ve sonra 4'te kalır.
 *  - Su kaydı gelince plan baştan hesaplanır: seviye 1'e döner.
 *  - Gelecek `horizonDays` günü planlar; toplam bildirim sayısı `maxScheduled`'ı aşmaz (iOS ~64 sınırı). Plan bittiğinde
 *    sonuna tek bir "duraklıyorum" bildirimi eklenir; uygulama açılınca plan yenilenir.
 */

export interface ReminderSettings {
  enabled: boolean;
  intervalMin: number;
  wakeMin: number;
  sleepMin: number;
  tone: Tone;
}

export interface PlanInput {
  now: Date;
  settings: ReminderSettings;
  /** Hedefi tamamlanmış günler (`YYYY-MM-DD`): dün ve bugün için bilinmesi yeterli. */
  completedDates: readonly string[];
  /** Dün/bugün son su kaydının zamanı; yoksa `null`. */
  lastLogAt: Date | null;
  horizonDays?: number;
  maxScheduled?: number;
}

export type ReminderKind = 'reminder' | 'pause';

export interface PlannedReminder {
  /** Aynı zaman için hep aynı kimlik. */
  id: string;
  fireAt: Date;
  title: string;
  body: string;
  kind: ReminderKind;
  /** Hatırlatma seviyesi 1–4; duraklama bildiriminde 0. */
  level: number;
}

export const APP_TITLE = 'Yudumla';
export const DEFAULT_HORIZON_DAYS = 3;
/** iOS bir uygulamanın en çok 64 yerel bildirim tutmasına izin verir; pay bırakılır. */
export const DEFAULT_MAX_SCHEDULED = 48;
export const MAX_LEVEL = 4;
/** Geçmiş/çok yakın zamanlar planlanmaz. */
const MIN_LEAD_MS = 5_000;
const PAUSE_DELAY_MS = 10 * 60_000;

export const PAUSE_BODY = 'Hatırlatmalar bir süre duraklıyor. Uygulamayı açarsan yeniden başlarım 🌱';

function dateAt(key: string, minute: number): Date {
  const d = parseDateKey(key);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(minute / 60), minute % 60, 0, 0);
}

/** `dateKey` gününün uyanıklık penceresi; uyuma saati uyanmadan önceyse bitiş ertesi güne taşar. */
export function awakeWindow(dateKey: string, wakeMin: number, sleepMin: number): { start: Date; end: Date } {
  const start = dateAt(dateKey, wakeMin);
  const end = sleepMin > wakeMin ? dateAt(dateKey, sleepMin) : dateAt(addDaysToKey(dateKey, 1), sleepMin);
  return { start, end };
}

/** Uyanma → uyuma arası dakika (gece yarısını aşabilir). 0 değil, en çok 1439. */
export function awakeSpanMin(wakeMin: number, sleepMin: number): number {
  return (sleepMin - wakeMin + 1440) % 1440;
}

/** Aralık uyanık süreden uzun ya da ona eşitse hiçbir hatırlatma gelmez (ilk hatırlatma = uyanma + aralık, uyuma saatinde/sonrasında kalır). */
export function noReminderFits(wakeMin: number, sleepMin: number, intervalMin: number): boolean {
  return wakeMin !== sleepMin && awakeSpanMin(wakeMin, sleepMin) <= intervalMin;
}

/** Seviye `k` (1, 2, 3, …) için metin; 4'ten sonra son seviye. Alternatif metin gün ve seviyeye göre dönüşümlü. */
export function reminderBody(tone: Tone, k: number, day: Date): string {
  const level = Math.min(Math.max(k, 1), MAX_LEVEL);
  const m = MESSAGES[tone];
  const useAlt = (day.getDate() + k) % 2 === 1;
  return (useAlt ? m.alt : m.rem)[level - 1]!;
}

export function planReminders(input: PlanInput): PlannedReminder[] {
  const { now, settings, completedDates, lastLogAt } = input;
  const horizon = input.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const maxScheduled = input.maxScheduled ?? DEFAULT_MAX_SCHEDULED;
  const { intervalMin, wakeMin, sleepMin, tone } = settings;

  if (!settings.enabled || wakeMin === sleepMin || !(intervalMin > 0) || maxScheduled < 2) return [];

  const done = new Set(completedDates);
  const todayKey = toLocalDateKey(now);
  const stepMs = intervalMin * 60_000;
  const items: PlannedReminder[] = [];

  // Dünün penceresi, gece yarısını aşan kuyruğu için de dahildir.
  for (let offset = -1; offset < horizon; offset++) {
    const dayKey = addDaysToKey(todayKey, offset);
    if (done.has(dayKey)) continue;
    const { start, end } = awakeWindow(dayKey, wakeMin, sleepMin);
    if (end.getTime() <= now.getTime()) continue;

    const anchor = lastLogAt && lastLogAt >= start && lastLogAt < end ? lastLogAt : start;
    for (let k = 1; ; k++) {
      const t = anchor.getTime() + k * stepMs;
      if (t >= end.getTime()) break;
      if (t <= now.getTime() + MIN_LEAD_MS) continue;
      const fireAt = new Date(t);
      items.push({
        id: `r-${t}`,
        fireAt,
        title: APP_TITLE,
        body: reminderBody(tone, k, fireAt),
        kind: 'reminder',
        level: Math.min(k, MAX_LEVEL),
      });
    }
  }

  items.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
  const kept = items.slice(0, maxScheduled - 1);
  const last = kept[kept.length - 1];
  if (!last) return [];
  const pauseAt = new Date(last.fireAt.getTime() + PAUSE_DELAY_MS);
  kept.push({ id: `p-${pauseAt.getTime()}`, fireAt: pauseAt, title: APP_TITLE, body: PAUSE_BODY, kind: 'pause', level: 0 });
  return kept;
}
