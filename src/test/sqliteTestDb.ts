import Database from 'better-sqlite3';
import type { Db, SqlValue } from '@/db/types';

/** Testlerde `Db` arayüzünün bellek içi (better-sqlite3) uygulaması; üretimle aynı SQL çalışır.
 * `file` verilirse dosya tabanlı çalışır (kapat-aç testleri için). */
export function createTestDb(file: string = ':memory:'): { db: Db; raw: Database.Database } {
  const raw = new Database(file);
  raw.pragma('foreign_keys = ON');

  const db: Db = {
    async execAsync(sql) {
      raw.exec(sql);
    },
    async runAsync(sql, params: readonly SqlValue[] = []) {
      const r = raw.prepare(sql).run(...params);
      return { changes: r.changes, lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getFirstAsync<T>(sql: string, params: readonly SqlValue[] = []) {
      return (raw.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(sql: string, params: readonly SqlValue[] = []) {
      return raw.prepare(sql).all(...params) as T[];
    },
    async withTransactionAsync(task) {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return { db, raw };
}
