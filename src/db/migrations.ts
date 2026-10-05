import type { Db } from './types';

export interface Migration {
  /** 1'den başlayıp birer birer artar; `PRAGMA user_version` ile eşleşir. */
  version: number;
  description: string;
  sql: string;
}

/**
 * Migration'lar yalnızca sona eklenir; yayınlanmış bir migration değiştirilmez.
 *
 * Şema notları:
 * - `days.goal_ml`: o günün hedef anlık görüntüsü. Sonradan hedef değişse de geçmiş günler değişmez.
 * - `water_logs.local_date`: yerel takvim günü (`YYYY-MM-DD`). Kayıt saati "günün dakikası" olarak tutulur;
 *   saat dilimi değişse de kayıt kendi gününde kalır.
 * - `water_logs.created_at`: UTC epoch ms (denetim amaçlı; gün hesabında kullanılmaz).
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    description: 'settings, days, water_logs',
    sql: `
      CREATE TABLE settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        daily_goal_ml INTEGER NOT NULL CHECK (daily_goal_ml BETWEEN 500 AND 4000)
      );
      INSERT INTO settings (id, daily_goal_ml) VALUES (1, 2000);

      CREATE TABLE days (
        local_date TEXT PRIMARY KEY
          CHECK (local_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        goal_ml INTEGER NOT NULL CHECK (goal_ml BETWEEN 500 AND 4000)
      );

      CREATE TABLE water_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_date TEXT NOT NULL REFERENCES days (local_date),
        minute_of_day INTEGER NOT NULL CHECK (minute_of_day BETWEEN 0 AND 1439),
        amount_ml INTEGER NOT NULL CHECK (amount_ml BETWEEN 10 AND 2000),
        created_at INTEGER NOT NULL
      );
      CREATE INDEX idx_water_logs_day ON water_logs (local_date, minute_of_day, id);
    `,
  },
];

export class MigrationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MigrationError';
  }
}

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

function assertSequential(migrations: readonly Migration[]): void {
  migrations.forEach((m, i) => {
    if (m.version !== i + 1) {
      throw new MigrationError(`Migration sırası bozuk: ${i + 1}. sırada sürüm ${m.version} var.`);
    }
  });
}

/**
 * Bekleyen migration'ları sırayla uygular. Her migration kendi işleminde (transaction) çalışır;
 * hata olursa o migration geri alınır ve sürüm numarası ilerlemez.
 * Veritabanı bu uygulamanın bildiğinden daha yeni bir sürümdeyse (ör. sürüm düşürme) veriye dokunmadan hata verir.
 */
export async function runMigrations(
  db: Db,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<{ from: number; to: number }> {
  assertSequential(migrations);
  const latest = migrations.length;

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current > latest) {
    throw new MigrationError(
      `Veritabanı sürümü (${current}) bu uygulamanın bildiği sürümden (${latest}) yeni.`,
    );
  }

  for (const m of migrations.slice(current)) {
    try {
      await db.withTransactionAsync(async () => {
        await db.execAsync(m.sql);
        // PRAGMA bağlı parametre almaz; sürüm kodumuzdan gelen bir tam sayıdır.
        await db.execAsync(`PRAGMA user_version = ${m.version}`);
      });
    } catch (cause) {
      throw new MigrationError(`Migration ${m.version} (${m.description}) uygulanamadı.`, {
        cause,
      });
    }
  }

  return { from: current, to: latest };
}
