/**
 * Yerel takvim günü yardımcıları.
 *
 * Gün her zaman cihazın yerel saatine göre `YYYY-MM-DD` anahtarıyla temsil edilir.
 * UTC'ye çevrilip geri dönülmez; böylece gece yarısı civarında kayıtlar yanlış güne düşmez.
 */

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

export const MONTHS_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const;

// Date#getDay() sırasıyla: Pazar = 0
export const WEEKDAYS_TR = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
] as const;

/** Verilen anın cihaz yerel takvim günü: `2026-10-02`. */
export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** `YYYY-MM-DD` anahtarı gerçek bir takvim günü mü? (2026-02-30 geçersizdir.) */
export function isValidDateKey(key: unknown): key is string {
  if (typeof key !== 'string') return false;
  const m = DATE_KEY.exec(key);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const probe = new Date(y, mo - 1, d);
  return probe.getFullYear() === y && probe.getMonth() === mo - 1 && probe.getDate() === d;
}

/** Bir sonraki takvim günü (`2026-10-31` → `2026-11-01`). Geçersiz anahtarda hata verir. */
export function nextDateKey(key: string): string {
  if (!isValidDateKey(key)) throw new Error(`Geçersiz gün anahtarı: ${key}`);
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return toLocalDateKey(new Date(y, m - 1, d + 1));
}

/** Günün dakikası: 00:00 → 0, 23:59 → 1439. */
export function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Prototipteki gösterim: 870 → `14.30`. */
export function formatMinuteOfDay(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${pad2(h)}.${pad2(m)}`;
}

/** `2 Ekim Cuma` */
export function formatDayHeading(date: Date): string {
  return `${date.getDate()} ${MONTHS_TR[date.getMonth()]} ${WEEKDAYS_TR[date.getDay()]}`;
}

/** Bir sonraki yerel gece yarısına kalan milisaniye (her zaman > 0). */
export function msUntilNextLocalMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/** Binlik ayraç olarak nokta: 2000 → `2.000`. */
export function formatMl(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
