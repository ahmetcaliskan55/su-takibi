import { addDaysToKey, isValidDateKey } from '@/domain/date';
import {
  sumAmounts,
  validateAmount,
  validateMinuteOfDay,
  type ValidationReason,
} from '@/domain/water';
import { ensureDaysThrough } from './days';
import { createMutex, type Mutex } from './mutex';
import type { Db } from './types';

export interface WaterLog {
  id: number;
  localDate: string;
  minuteOfDay: number;
  amountMl: number;
  /** UTC epoch ms; geri yüklemede korunur. */
  createdAt: number;
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
  created_at: number;
}

export class LogNotFoundError extends Error {
  constructor(public readonly id: number) {
    super(`Kayıt bulunamadı: ${id}`);
    this.name = 'LogNotFoundError';
  }
}

const toLog = (r: LogRow): WaterLog => ({
  id: r.id,
  localDate: r.local_date,
  minuteOfDay: r.minute_of_day,
  amountMl: r.amount_ml,
  createdAt: r.created_at,
});

/** Bir günün özeti (kayıt listesi olmadan): geçmiş ekranı için. */
export interface DayTotal {
  localDate: string;
  goalMl: number;
  totalMl: number;
}

/** Hatırlatma planı için gereken durum (dün + bugün). */
export interface ReminderState {
  /** Hedefi tamamlanmış günler. */
  completedDates: string[];
  /** Dün/bugün en son su kaydı; yoksa `null`. */
  lastLog: { localDate: string; minuteOfDay: number } | null;
}

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
  /** Gün satırı olan günlerin toplamları (`from`–`to` dahil). Satırı olmayan gün "veri yok"tur. */
  getTotals(from: string, to: string): Promise<DayTotal[]>;
  /** Kayıtlı en eski gün; hiç yoksa `null`. */
  firstDay(): Promise<string | null>;
  /** Günü OLUŞTURMADAN okur (salt okunur geçmiş görünümü); satırı yoksa `null`. */
  peekDay(localDate: string): Promise<DaySummary | null>;
  /** Hatırlatma planı için dün ve bugünün durumu (günleri OLUŞTURMAZ). */
  reminderState(todayKey: string): Promise<ReminderState>;
  /** Tek kayıt; yoksa `null`. */
  getLog(id: number): Promise<WaterLog | null>;
  /** Miktarı/saati günceller; gün ve oluşturma zamanı değişmez. Önceki ve sonraki hâli döndürür. */
  updateLog(id: number, patch: { minuteOfDay: number; amountMl: number }): Promise<{ before: WaterLog; after: WaterLog }>;
  /** Kaydı siler ve silinen kaydı döndürür (geri alma için). */
  deleteLog(id: number): Promise<WaterLog>;
  /** Silinmiş kaydı aynı kimlik ve içerikle geri koyar (yalnızca geri alma için). */
  restoreLog(log: WaterLog): Promise<void>;
}

/** `exclusive`: aynı bağlantıyı kullanan depolar arasında paylaşılan kilit (işlemler iç içe girmesin). */
export function createWaterRepository(db: Db, exclusive: Mutex = createMutex()): WaterRepository {

  const ensureDay = (localDate: string) => ensureDaysThrough(db, localDate);

  async function readDay(localDate: string): Promise<DaySummary> {
    const day = await db.getFirstAsync<{ goal_ml: number }>(
      'SELECT goal_ml FROM days WHERE local_date = ?',
      [localDate],
    );
    if (!day) throw new Error(`Gün satırı bulunamadı: ${localDate}`);
    const rows = await db.getAllAsync<LogRow>(
      `SELECT id, local_date, minute_of_day, amount_ml, created_at
       FROM water_logs WHERE local_date = ?
       ORDER BY minute_of_day DESC, id DESC`,
      [localDate],
    );
    const logs = rows.map(toLog);
    return { localDate, goalMl: day.goal_ml, totalMl: sumAmounts(logs), logs };
  }

  async function readLog(id: number): Promise<WaterLog | null> {
    const row = await db.getFirstAsync<LogRow>(
      'SELECT id, local_date, minute_of_day, amount_ml, created_at FROM water_logs WHERE id = ?',
      [id],
    );
    return row ? toLog(row) : null;
  }

  function requireDate(localDate: string): void {
    if (!isValidDateKey(localDate)) throw new RepositoryValidationError('date_invalid');
  }

  return {
    async loadDay(localDate) {
      requireDate(localDate);
      return exclusive(async () => {
        await db.withTransactionAsync(() => ensureDay(localDate));
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
            createdAt: nowMs,
          };
        });
        if (!created) throw new Error('Kayıt eklenemedi.');
        return created;
      });
    },

    getLog: (id) => exclusive(() => readLog(id)),

    async reminderState(todayKey) {
      requireDate(todayKey);
      const from = addDaysToKey(todayKey, -1);
      return exclusive(async () => {
        const days = await db.getAllAsync<{ local_date: string; goal_ml: number; total: number }>(
          `SELECT d.local_date, d.goal_ml, COALESCE(SUM(w.amount_ml), 0) AS total
           FROM days d LEFT JOIN water_logs w ON w.local_date = d.local_date
           WHERE d.local_date BETWEEN ? AND ? GROUP BY d.local_date, d.goal_ml`,
          [from, todayKey],
        );
        const last = await db.getFirstAsync<{ local_date: string; minute_of_day: number }>(
          `SELECT local_date, minute_of_day FROM water_logs WHERE local_date BETWEEN ? AND ?
           ORDER BY local_date DESC, minute_of_day DESC, id DESC LIMIT 1`,
          [from, todayKey],
        );
        return {
          completedDates: days.filter((d) => d.total >= d.goal_ml).map((d) => d.local_date),
          lastLog: last ? { localDate: last.local_date, minuteOfDay: last.minute_of_day } : null,
        };
      });
    },

    async getTotals(from, to) {
      requireDate(from);
      requireDate(to);
      return exclusive(async () => {
        const rows = await db.getAllAsync<{ local_date: string; goal_ml: number; total: number }>(
          `SELECT d.local_date, d.goal_ml, COALESCE(SUM(w.amount_ml), 0) AS total
           FROM days d LEFT JOIN water_logs w ON w.local_date = d.local_date
           WHERE d.local_date BETWEEN ? AND ?
           GROUP BY d.local_date, d.goal_ml
           ORDER BY d.local_date`,
          [from, to],
        );
        return rows.map((r) => ({ localDate: r.local_date, goalMl: r.goal_ml, totalMl: r.total }));
      });
    },

    firstDay: () =>
      exclusive(async () => (await db.getFirstAsync<{ d: string | null }>('SELECT MIN(local_date) AS d FROM days'))?.d ?? null),

    async peekDay(localDate) {
      requireDate(localDate);
      return exclusive(async () => {
        const exists = await db.getFirstAsync<{ n: number }>('SELECT 1 AS n FROM days WHERE local_date = ?', [localDate]);
        return exists ? readDay(localDate) : null;
      });
    },

    async updateLog(id, patch) {
      const amount = validateAmount(patch.amountMl);
      if (!amount.ok) throw new RepositoryValidationError(amount.reason);
      const minute = validateMinuteOfDay(patch.minuteOfDay);
      if (!minute.ok) throw new RepositoryValidationError(minute.reason);

      return exclusive(async () => {
        let result: { before: WaterLog; after: WaterLog } | undefined;
        await db.withTransactionAsync(async () => {
          const before = await readLog(id);
          if (!before) throw new LogNotFoundError(id);
          await db.runAsync('UPDATE water_logs SET minute_of_day = ?, amount_ml = ? WHERE id = ?', [
            patch.minuteOfDay,
            patch.amountMl,
            id,
          ]);
          const after = await readLog(id);
          if (!after) throw new LogNotFoundError(id);
          result = { before, after };
        });
        if (!result) throw new Error('Kayıt güncellenemedi.');
        return result;
      });
    },

    async deleteLog(id) {
      return exclusive(async () => {
        let removed: WaterLog | undefined;
        await db.withTransactionAsync(async () => {
          const row = await readLog(id);
          if (!row) throw new LogNotFoundError(id);
          const res = await db.runAsync('DELETE FROM water_logs WHERE id = ?', [id]);
          if (res.changes !== 1) throw new Error('Kayıt silinemedi.');
          removed = row;
        });
        if (!removed) throw new Error('Kayıt silinemedi.');
        return removed;
      });
    },

    async restoreLog(log) {
      requireDate(log.localDate);
      return exclusive(async () => {
        await db.withTransactionAsync(async () => {
          await ensureDay(log.localDate);
          await db.runAsync(
            `INSERT INTO water_logs (id, local_date, minute_of_day, amount_ml, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [log.id, log.localDate, log.minuteOfDay, log.amountMl, log.createdAt],
          );
        });
      });
    },
  };
}
