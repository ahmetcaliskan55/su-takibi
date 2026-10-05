import fs from 'node:fs';
import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from 'sql.js';
import type { Db, SqlValue } from '@/db/types';

/**
 * Testlerde `Db` arayüzünün SQLite (sql.js, WebAssembly) uygulaması.
 * Yerel derleme gerektirmez; Windows'ta C++ araçları olmadan `npm ci` çalışır.
 * Üretimdeki `expo-sqlite` ile aynı migration ve SQL burada çalışır; ancak `expo-sqlite`'ın kendisi
 * (telefondaki sürücü, WAL, dosya G/Ç) bu testlerde YOKTUR ve ayrıca cihazda denenmelidir.
 */

let sqlJs: Promise<SqlJsStatic> | null = null;
const loadSqlJs = (): Promise<SqlJsStatic> => (sqlJs ??= initSqlJs());

type Row = Record<string, unknown>;

/** Testlerin doğrudan SQL çalıştırması için küçük, better-sqlite3 benzeri yüzey. */
export interface RawDb {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: SqlValue[]): { changes: number };
    get(...params: SqlValue[]): Row | undefined;
    all(...params: SqlValue[]): Row[];
  };
  /** `pragma('user_version', { simple: true })` → değer; `pragma('user_version = 3')` → atama. */
  pragma(text: string, options?: { simple?: boolean }): unknown;
  /** Dosya verildiyse içeriği o dosyaya yazar ve bağlantıyı kapatır. */
  close(): void;
}

function toRaw(db: SqlJsDatabase, file: string | undefined): RawDb {
  return {
    exec: (sql) => void db.exec(sql),
    prepare: (sql) => ({
      run(...params) {
        db.run(sql, params);
        return { changes: db.getRowsModified() };
      },
      get(...params) {
        const stmt = db.prepare(sql);
        try {
          stmt.bind(params);
          return stmt.step() ? (stmt.getAsObject() as Row) : undefined;
        } finally {
          stmt.free();
        }
      },
      all(...params) {
        const stmt = db.prepare(sql);
        try {
          stmt.bind(params);
          const rows: Row[] = [];
          while (stmt.step()) rows.push(stmt.getAsObject() as Row);
          return rows;
        } finally {
          stmt.free();
        }
      },
    }),
    pragma(text, options) {
      const result = db.exec(`PRAGMA ${text}`)[0];
      if (!result) return undefined;
      if (options?.simple) return result.values[0]?.[0];
      return result.values.map((r) => Object.fromEntries(r.map((v, i) => [result.columns[i], v])));
    },
    close() {
      if (file) fs.writeFileSync(file, Buffer.from(db.export()));
      db.close();
    },
  };
}

/**
 * Bellek içi veritabanı oluşturur. `file` verilirse varsa içeriği yüklenir ve `raw.close()` ile geri yazılır;
 * böylece "kapat-aç" senaryosu (verinin ve migration sürümünün korunması) test edilebilir.
 */
export async function createTestDb(file?: string): Promise<{ db: Db; raw: RawDb }> {
  const SQL = await loadSqlJs();
  const bytes = file && fs.existsSync(file) ? fs.readFileSync(file) : undefined;
  const sql = new SQL.Database(bytes);
  sql.run('PRAGMA foreign_keys = ON');
  const raw = toRaw(sql, file);

  const db: Db = {
    async execAsync(source) {
      sql.exec(source);
    },
    async runAsync(source, params: readonly SqlValue[] = []) {
      sql.run(source, [...params]);
      const changes = sql.getRowsModified();
      const id = sql.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0];
      return { changes, lastInsertRowId: Number(id ?? 0) };
    },
    async getFirstAsync<T>(source: string, params: readonly SqlValue[] = []) {
      return (raw.prepare(source).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(source: string, params: readonly SqlValue[] = []) {
      return raw.prepare(source).all(...params) as T[];
    },
    async withTransactionAsync(task) {
      sql.run('BEGIN');
      try {
        await task();
        sql.run('COMMIT');
      } catch (e) {
        sql.run('ROLLBACK');
        throw e;
      }
    },
  };
  return { db, raw };
}
