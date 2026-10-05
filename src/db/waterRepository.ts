import { isValidDateKey } from '@/domain/date';
import {
  sumAmounts,
  validateAmount,
  validateMinuteOfDay,
  type ValidationReason,
} from '@/domain/water';
import { createMutex } from './mutex';
import type { Db } from './types';

export interface WaterLog {
  id: number;
  localDate: string;
  minuteOfDay: number;
  amountMl: number;
}

export interface DaySummary {
  localDate: string;
  /** O günün dondurulmuş hedefi */
  goalMl: number;
  totalMl: number;
  /** En yeni kayıt başta */
  logs: WaterLog[];
}

export class RepositoryValidationError extends Error {
  constructor(public readonly reason: ValidationReason) {
    super(`Geçersiz kayıt: ${reason}`);
    this.name = 'RepositoryValidationError';
  }
}

interface LogRow {
  id: number;
  local_date: string;
  minute_of_day: number;
  amount_ml: number;
}

const toLog = (r: LogRow): WaterLog => ({
  id: r.id,
  localDate: r.local_date,
  minuteOfDay: r.minute_of_day,
  amountMl: r.amount_ml,
});

export interface NewLogRecord {
  localDate: string;
  minuteOfDay: number;
  amountMl: number;
}

export interface WaterRepository {
  /**
   * Günü yükler. O günün satırı yoksa güncel hedeften bir anlık görüntü oluşturur;
   * satır varsa dokunmaz (hedef sonradan değişse de gün değişmez).
   * Yalnızca verilen günün kayıtlarını döndürür.
   */
  loadDay(localDate: string): Promise<DaySummary>;
  /** Doğrulanmış kaydı ekler; gün satırı yoksa aynı işlemde anlık görüntüyü oluşturur. */
  addLog(record: NewLogRecord, nowMs: number): Promise<WaterLog>;
}

export function createWaterRepository(db: Db): WaterRepository {
  const exclusive = createMutex();

  async function ensureDay(localDate: string): Promise<void> {
    await db.runAsync(
      `INSERT OR IGNORE INTO days (local_date, goal_ml)
       SELECT ?, daily_goal_ml FROM settings WHERE id = 1`,
      [localDate],
    );
  }

  async function readDay(localDate: string): Promise<DaySummary> {
    const day = await db.getFirstAsync<{ goal_ml: number }>(
      'SELECT goal_ml FROM days WHERE local_date = ?',
      [localDate],
    );
    if (!day) throw new Error(`Gün satırı bulunamadı: ${localDate}`);
    const rows = await db.getAllAsync<LogRow>(
      `SELECT id, local_date, minute_of_day, amount_ml
       FROM water_logs WHERE local_date = ?
       ORDER BY minute_of_day DESC, id DESC`,
      [localDate],
    );
    const logs = rows.map(toLog);
    return { localDate, goalMl: day.goal_ml, totalMl: sumAmounts(logs), logs };
  }

  function requireDate(localDate: string): void {
    if (!isValidDateKey(localDate)) throw new RepositoryValidationError('date_invalid');
  }

  return {
    async loadDay(localDate) {
      requireDate(localDate);
      return exclusive(async () => {
        await ensureDay(localDate);
        return readDay(localDate);
      });
    },

    async addLog(record, nowMs) {
      requireDate(record.localDate);
      const amount = validateAmount(record.amountMl);
      if (!amount.ok) throw new RepositoryValidationError(amount.reason);
      const minute = validateMinuteOfDay(record.minuteOfDay);
      if (!minute.ok) throw new RepositoryValidationError(minute.reason);

      return exclusive(async () => {
        let created: WaterLog | undefined;
        await db.withTransactionAsync(async () => {
          await ensureDay(record.localDate);
          const res = await db.runAsync(
            `INSERT INTO water_logs (local_date, minute_of_day, amount_ml, created_at)
             VALUES (?, ?, ?, ?)`,
            [record.localDate, record.minuteOfDay, record.amountMl, nowMs],
          );
          created = {
            id: res.lastInsertRowId,
            localDate: record.localDate,
            minuteOfDay: record.minuteOfDay,
            amountMl: record.amountMl,
          };
        });
        if (!created) throw new Error('Kayıt eklenemedi.');
        return created;
      });
    },
  };
}
