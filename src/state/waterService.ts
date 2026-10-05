import { minuteOfDay, toLocalDateKey } from '@/domain/date';
import { validateNewLog, type ValidationReason } from '@/domain/water';
import type { DaySummary, WaterLog, WaterRepository } from '@/db/waterRepository';

export class AddWaterError extends Error {
  constructor(public readonly reason: ValidationReason) {
    super(`Su kaydı eklenemedi: ${reason}`);
    this.name = 'AddWaterError';
  }
}

/** Son işlemi tersine çevirmek için gereken bilgi. Her işlem yalnızca kendi tersini taşır. */
export type UndoAction =
  | { kind: 'add'; log: WaterLog }
  | { kind: 'edit'; before: WaterLog; after: WaterLog }
  | { kind: 'delete'; log: WaterLog };

export interface LogInput {
  amountMl: number;
  minuteOfDay: number;
}

/** Verilen anın yerel gününü yükler (gerekirse günün hedef anlık görüntüsünü oluşturur). */
export function loadToday(repo: WaterRepository, now: Date): Promise<DaySummary> {
  return repo.loadDay(toLocalDateKey(now));
}

/** Aşama 2'de yalnızca bugünün kayıtları eklenir/düzenlenir; gelecekteki saat reddedilir. */
function assertAllowed(localDate: string, input: LogInput, now: Date): void {
  const checked = validateNewLog(
    { localDate, minuteOfDay: input.minuteOfDay, amountMl: input.amountMl },
    toLocalDateKey(now),
    minuteOfDay(now),
  );
  if (!checked.ok) throw new AddWaterError(checked.reason);
}

/** Bugüne, verilen saatle kayıt ekler. Doğrulamayı geçmeyen kayıt veritabanına gitmez. */
export async function addWater(repo: WaterRepository, input: LogInput, now: Date): Promise<WaterLog> {
  const localDate = toLocalDateKey(now);
  assertAllowed(localDate, input, now);
  return repo.addLog({ localDate, ...input }, now.getTime());
}

/** Hızlı ekleme: saat olarak şu an kullanılır. */
export function addWaterNow(repo: WaterRepository, amountMl: number, now: Date): Promise<WaterLog> {
  return addWater(repo, { amountMl, minuteOfDay: minuteOfDay(now) }, now);
}

/** Mevcut kaydı düzenler (yalnızca bugünün kaydı). */
export async function editWater(
  repo: WaterRepository,
  id: number,
  input: LogInput,
  now: Date,
): Promise<{ before: WaterLog; after: WaterLog }> {
  const existing = await repo.getLog(id);
  // Kayıt yoksa updateLog LogNotFoundError fırlatır.
  assertAllowed(existing?.localDate ?? toLocalDateKey(now), input, now);
  return repo.updateLog(id, input);
}

export function deleteWater(repo: WaterRepository, id: number): Promise<WaterLog> {
  return repo.deleteLog(id);
}

/** Verilen işlemin tersini uygular; yalnızca o işleme dokunur. */
export async function undoWater(repo: WaterRepository, action: UndoAction): Promise<void> {
  switch (action.kind) {
    case 'add':
      await repo.deleteLog(action.log.id);
      return;
    case 'edit':
      await repo.updateLog(action.before.id, {
        minuteOfDay: action.before.minuteOfDay,
        amountMl: action.before.amountMl,
      });
      return;
    case 'delete':
      await repo.restoreLog(action.log);
      return;
  }
}
