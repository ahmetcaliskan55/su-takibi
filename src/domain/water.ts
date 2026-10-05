import { isValidDateKey } from './date';

/** Hızlı ekleme düğmeleri (ml). */
export const QUICK_AMOUNTS_ML = [150, 250, 500] as const;

/** Tek kayıt için izin verilen aralık (prototipteki sınır). */
export const MIN_AMOUNT_ML = 10;
export const MAX_AMOUNT_ML = 2000;

/** Günlük hedef için izin verilen aralık (prototipteki sınır; tıbbi bir eşik değildir). */
export const MIN_GOAL_ML = 500;
export const MAX_GOAL_ML = 4000;

/**
 * Yalnızca geliştirme varsayılanı. Kişiye özel bir öneri DEĞİLDİR ve arayüzde öyle sunulmaz.
 * Yaş/kilo/aktiviteye göre hedef önerisi, kaynakları değerlendirildikten sonra ayrı bir aşamada ele alınacak.
 */
export const DEFAULT_GOAL_ML = 2000;

export type ValidationReason =
  | 'amount_not_integer'
  | 'amount_too_small'
  | 'amount_too_large'
  | 'minute_invalid'
  | 'date_invalid'
  | 'not_today'
  | 'time_in_future'
  | 'goal_invalid';

export type Validation<T> = { ok: true; value: T } | { ok: false; reason: ValidationReason };

const ok = <T>(value: T): Validation<T> => ({ ok: true, value });
const fail = (reason: ValidationReason): Validation<never> => ({ ok: false, reason });

/** Miktar: tam sayı ml, 10..2000. NaN, Infinity, ondalık, negatif ve sıfır reddedilir. */
export function validateAmount(amount: unknown): Validation<number> {
  if (typeof amount !== 'number' || !Number.isInteger(amount)) return fail('amount_not_integer');
  if (amount < MIN_AMOUNT_ML) return fail('amount_too_small');
  if (amount > MAX_AMOUNT_ML) return fail('amount_too_large');
  return ok(amount);
}

/** Günün dakikası: 0..1439 tam sayı. */
export function validateMinuteOfDay(minute: unknown): Validation<number> {
  if (typeof minute !== 'number' || !Number.isInteger(minute) || minute < 0 || minute > 1439) {
    return fail('minute_invalid');
  }
  return ok(minute);
}

/** Günlük hedef: tam sayı ml, 500..4000. */
export function validateGoal(goal: unknown): Validation<number> {
  if (
    typeof goal !== 'number' ||
    !Number.isInteger(goal) ||
    goal < MIN_GOAL_ML ||
    goal > MAX_GOAL_ML
  ) {
    return fail('goal_invalid');
  }
  return ok(goal);
}

export interface NewLogInput {
  localDate: string;
  minuteOfDay: number;
  amountMl: number;
}

/**
 * Yeni kayıt doğrulaması (Aşama 1: yalnızca bugüne kayıt eklenir).
 * - Tarih geçerli bir takvim günü ve `todayKey` olmalı.
 * - Saat bugün için şu andan ileri olamaz.
 */
export function validateNewLog(
  input: NewLogInput,
  todayKey: string,
  nowMinute: number,
): Validation<NewLogInput> {
  const amount = validateAmount(input.amountMl);
  if (!amount.ok) return amount;
  const minute = validateMinuteOfDay(input.minuteOfDay);
  if (!minute.ok) return minute;
  if (!isValidDateKey(input.localDate)) return fail('date_invalid');
  if (input.localDate !== todayKey) return fail('not_today');
  if (input.minuteOfDay > nowMinute) return fail('time_in_future');
  return ok(input);
}

export function sumAmounts(logs: readonly { amountMl: number }[]): number {
  let total = 0;
  for (const l of logs) total += l.amountMl;
  return total;
}
