import { minuteOfDay, toLocalDateKey } from '@/domain/date';
import { validateNewLog, type ValidationReason } from '@/domain/water';
import type { DaySummary, WaterLog, WaterRepository } from '@/db/waterRepository';

export class AddWaterError extends Error {
  constructor(public readonly reason: ValidationReason) {
    super(`Su kaydı eklenemedi: ${reason}`);
    this.name = 'AddWaterError';
  }
}

/** Verilen anın yerel gününü yükler (gerekirse günün hedef anlık görüntüsünü oluşturur). */
export function loadToday(repo: WaterRepository, now: Date): Promise<DaySummary> {
  return repo.loadDay(toLocalDateKey(now));
}

/**
 * Şu an için su kaydı ekler (hızlı ekleme). Gün ve saat `now`'dan yerel saate göre alınır.
 * Doğrulamayı geçmeyen kayıt veritabanına gitmez.
 */
export async function addWaterNow(
  repo: WaterRepository,
  amountMl: number,
  now: Date,
): Promise<WaterLog> {
  const todayKey = toLocalDateKey(now);
  const nowMinute = minuteOfDay(now);
  const checked = validateNewLog(
    { localDate: todayKey, minuteOfDay: nowMinute, amountMl },
    todayKey,
    nowMinute,
  );
  if (!checked.ok) throw new AddWaterError(checked.reason);
  return repo.addLog(checked.value, now.getTime());
}
