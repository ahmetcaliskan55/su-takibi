import { createTestDb, type RawDb } from '@/test/sqliteTestDb';
import { LATEST_VERSION, MIGRATIONS, MigrationError, runMigrations, type Migration } from './migrations';

const tables = (raw: RawDb) =>
  (raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[]).map((r) => r.name);

describe('runMigrations', () => {
  it('boş veritabanını en son sürüme getirir', async () => {
    const { db, raw } = await createTestDb();
    const res = await runMigrations(db);
    expect(res).toEqual({ from: 0, to: LATEST_VERSION });
    expect(raw.pragma('user_version', { simple: true })).toBe(LATEST_VERSION);
    expect(tables(raw)).toEqual(expect.arrayContaining(['days', 'settings', 'water_logs']));
  });

  it('tekrar çalıştırıldığında hiçbir şey değiştirmez ve veriyi korur', async () => {
    const { db, raw } = await createTestDb();
    await runMigrations(db);
    raw.prepare("INSERT INTO days (local_date, goal_ml) VALUES ('2026-10-02', 2000)").run();
    const res = await runMigrations(db);
    expect(res).toEqual({ from: LATEST_VERSION, to: LATEST_VERSION });
    expect(raw.prepare('SELECT COUNT(*) AS n FROM days').get()).toEqual({ n: 1 });
  });

  it('geliştirme varsayılanı olan hedefi ayarlara yazar', async () => {
    const { db, raw } = await createTestDb();
    await runMigrations(db);
    expect(raw.prepare('SELECT daily_goal_ml FROM settings WHERE id = 1').get()).toEqual({ daily_goal_ml: 2000 });
  });

  it('veritabanı uygulamadan yeniyse veriye dokunmadan hata verir', async () => {
    const { db, raw } = await createTestDb();
    await runMigrations(db);
    raw.pragma(`user_version = ${LATEST_VERSION + 1}`);
    await expect(runMigrations(db)).rejects.toBeInstanceOf(MigrationError);
    expect(raw.pragma('user_version', { simple: true })).toBe(LATEST_VERSION + 1);
  });

  it('başarısız migration geri alınır ve sürüm ilerlemez', async () => {
    const { db, raw } = await createTestDb();
    const broken: Migration[] = [
      ...MIGRATIONS,
      { version: LATEST_VERSION + 1, description: 'bozuk', sql: 'CREATE TABLE yarim (a INTEGER); SELECT * FROM olmayan_tablo;' },
    ];
    await expect(runMigrations(db, broken)).rejects.toBeInstanceOf(MigrationError);
    expect(raw.pragma('user_version', { simple: true })).toBe(LATEST_VERSION);
    expect(tables(raw)).not.toContain('yarim');
  });

  it('sıra bozuksa uygulamaz', async () => {
    const { db, raw } = await createTestDb();
    const gap: Migration[] = [{ version: 2, description: 'atlanmış', sql: 'SELECT 1' }];
    await expect(runMigrations(db, gap)).rejects.toBeInstanceOf(MigrationError);
    expect(raw.pragma('user_version', { simple: true })).toBe(0);
  });
});

describe('şema kısıtları (veritabanı da kendi başına doğrular)', () => {
  async function ready() {
    const t = await createTestDb();
    await runMigrations(t.db);
    t.raw.prepare("INSERT INTO days (local_date, goal_ml) VALUES ('2026-10-02', 2000)").run();
    return t.raw;
  }
  const insertLog = (raw: Awaited<ReturnType<typeof ready>>, date: string, minute: number, ml: number) =>
    raw.prepare('INSERT INTO water_logs (local_date, minute_of_day, amount_ml, created_at) VALUES (?, ?, ?, 0)').run(date, minute, ml);

  it('geçerli kaydı kabul eder', async () => {
    const raw = await ready();
    expect(() => insertLog(raw, '2026-10-02', 600, 250)).not.toThrow();
  });

  it.each([0, -250, 9, 2001])('amount_ml=%i reddedilir', async (ml) => {
    const raw = await ready();
    expect(() => insertLog(raw, '2026-10-02', 600, ml)).toThrow();
  });

  it.each([-1, 1440])('minute_of_day=%i reddedilir', async (m) => {
    const raw = await ready();
    expect(() => insertLog(raw, '2026-10-02', m, 250)).toThrow();
  });

  it('gün satırı olmayan tarihe kayıt eklenemez (yabancı anahtar)', async () => {
    const raw = await ready();
    expect(() => insertLog(raw, '2026-10-03', 600, 250)).toThrow();
  });

  it('biçimi bozuk gün anahtarını reddeder; hedef sınırı dışını reddeder', async () => {
    const raw = await ready();
    expect(() => raw.prepare("INSERT INTO days (local_date, goal_ml) VALUES ('2.10.2026', 2000)").run()).toThrow();
    expect(() => raw.prepare("INSERT INTO days (local_date, goal_ml) VALUES ('2026-10-04', 100)").run()).toThrow();
  });
});
