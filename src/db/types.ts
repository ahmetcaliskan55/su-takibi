export type SqlValue = string | number | null;

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

/**
 * Uygulamanın ihtiyaç duyduğu en küçük SQLite yüzeyi.
 * Üretimde `expo-sqlite`, testlerde `better-sqlite3` bu arayüze uyarlanır;
 * aynı migration ve sorgular iki tarafta da çalışır.
 */
export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: readonly SqlValue[]): Promise<RunResult>;
  getFirstAsync<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
