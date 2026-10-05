import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';
import type { Db } from './types';

export const DATABASE_NAME = 'yudumla.db';

/** `expo-sqlite` veritabanını uygulamanın `Db` arayüzüne uyarlar. */
export function adaptExpoDb(db: SQLite.SQLiteDatabase): Db {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: async (sql, params = []) => {
      const r = await db.runAsync(sql, [...params]);
      return { changes: r.changes, lastInsertRowId: r.lastInsertRowId };
    },
    getFirstAsync: (sql, params = []) => db.getFirstAsync(sql, [...params]),
    getAllAsync: (sql, params = []) => db.getAllAsync(sql, [...params]),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}

/** Veritabanını açar, bağlantı ayarlarını yapar, migration'ları uygular. */
export async function openAppDatabase(): Promise<Db> {
  const native = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const db = adaptExpoDb(native);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await runMigrations(db);
  return db;
}
