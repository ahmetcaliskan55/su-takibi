import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTestDb } from '@/test/sqliteTestDb';
import { runMigrations } from './migrations';
import { createWaterRepository, RepositoryValidationError } from './waterRepository';

async function setup() {
  const t = createTestDb();
  await runMigrations(t.db);
  return { ...t, repo: createWaterRepository(t.db) };
}

const D1 = '2026-10-01';
const D2 = '2026-10-02';

describe('loadDay', () => {
  it('kayıt yokken toplam 0 ve güncel hedeften anlık görüntü oluşturur', async () => {
    const { repo, raw } = await setup();
    const day = await repo.loadDay(D2);
    expect(day).toEqual({ localDate: D2, goalMl: 2000, totalMl: 0, logs: [] });
    expect(raw.prepare('SELECT goal_ml FROM days WHERE local_date = ?').get(D2)).toEqual({ goal_ml: 2000 });
  });

  it('hedef sonradan değişse de mevcut günün anlık görüntüsü değişmez; yeni gün yeni hedefi alır', async () => {
    const { repo, raw } = await setup();
    await repo.loadDay(D1);
    raw.prepare('UPDATE settings SET daily_goal_ml = 3000 WHERE id = 1').run();
    expect((await repo.loadDay(D1)).goalMl).toBe(2000);
    expect((await repo.loadDay(D2)).goalMl).toBe(3000);
  });

  it('yalnızca istenen günün kayıtlarını toplar; farklı günler birleşmez', async () => {
    const { repo } = await setup();
    await repo.addLog({ localDate: D1, minuteOfDay: 23 * 60 + 50, amountMl: 500 }, 1);
    await repo.addLog({ localDate: D2, minuteOfDay: 10, amountMl: 250 }, 2);
    await repo.addLog({ localDate: D2, minuteOfDay: 600, amountMl: 150 }, 3);

    const d1 = await repo.loadDay(D1);
    const d2 = await repo.loadDay(D2);
    expect(d1.totalMl).toBe(500);
    expect(d1.logs).toHaveLength(1);
    expect(d2.totalMl).toBe(400);
    expect(d2.logs).toHaveLength(2);
  });

  it('kayıtları en yeni saat başta, aynı dakikada en son eklenen başta sıralar', async () => {
    const { repo } = await setup();
    const a = await repo.addLog({ localDate: D2, minuteOfDay: 600, amountMl: 150 }, 1);
    const b = await repo.addLog({ localDate: D2, minuteOfDay: 480, amountMl: 250 }, 2);
    const c = await repo.addLog({ localDate: D2, minuteOfDay: 600, amountMl: 500 }, 3);
    const { logs } = await repo.loadDay(D2);
    expect(logs.map((l) => l.id)).toEqual([c.id, a.id, b.id]);
  });

  it('geçersiz tarihi reddeder', async () => {
    const { repo } = await setup();
    await expect(repo.loadDay('2026-02-30')).rejects.toBeInstanceOf(RepositoryValidationError);
  });
});

describe('addLog', () => {
  it('gün satırı yoksa aynı işlemde oluşturur ve kaydı döndürür', async () => {
    const { repo, raw } = await setup();
    const log = await repo.addLog({ localDate: D2, minuteOfDay: 870, amountMl: 250 }, 123);
    expect(log).toMatchObject({ localDate: D2, minuteOfDay: 870, amountMl: 250 });
    expect(log.id).toBeGreaterThan(0);
    expect(raw.prepare('SELECT created_at FROM water_logs WHERE id = ?').get(log.id)).toEqual({ created_at: 123 });
  });

  it.each([
    ['sıfır', { amountMl: 0 }, 'amount_too_small'],
    ['negatif', { amountMl: -250 }, 'amount_too_small'],
    ['ondalık', { amountMl: 250.5 }, 'amount_not_integer'],
    ['çok büyük', { amountMl: 5000 }, 'amount_too_large'],
    ['NaN', { amountMl: Number.NaN }, 'amount_not_integer'],
    ['saat 1440', { minuteOfDay: 1440 }, 'minute_invalid'],
    ['saat negatif', { minuteOfDay: -1 }, 'minute_invalid'],
    ['bozuk tarih', { localDate: '2026-02-30' }, 'date_invalid'],
  ] as const)('%s kayıt reddedilir ve hiçbir şey yazılmaz', async (_name, patch, reason) => {
    const { repo, raw } = await setup();
    const base = { localDate: D2, minuteOfDay: 600, amountMl: 250 };
    await expect(repo.addLog({ ...base, ...patch }, 1)).rejects.toMatchObject({ reason });
    expect(raw.prepare('SELECT COUNT(*) AS n FROM water_logs').get()).toEqual({ n: 0 });
    expect(raw.prepare('SELECT COUNT(*) AS n FROM days').get()).toEqual({ n: 0 });
  });

  it('eşzamanlı eklemeler birbirini ezmez, hepsi yazılır', async () => {
    const { repo } = await setup();
    await Promise.all(
      [150, 250, 500, 150, 250].map((ml, i) => repo.addLog({ localDate: D2, minuteOfDay: 100 + i, amountMl: ml }, i)),
    );
    const day = await repo.loadDay(D2);
    expect(day.logs).toHaveLength(5);
    expect(day.totalMl).toBe(1300);
  });
});

describe('kalıcılık', () => {
  it('bağlantı kapatılıp dosya yeniden açılınca kayıtlar ve hedef anlık görüntüsü korunur', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yudumla-'));
    const file = path.join(dir, 'test.db');
    try {
      const first = createTestDb(file);
      await runMigrations(first.db);
      const repo1 = createWaterRepository(first.db);
      await repo1.addLog({ localDate: D2, minuteOfDay: 600, amountMl: 250 }, 1);
      first.raw.prepare('UPDATE settings SET daily_goal_ml = 3500 WHERE id = 1').run();
      first.raw.close();

      const second = createTestDb(file);
      const res = await runMigrations(second.db);
      expect(res.from).toBe(res.to); // yeniden açılışta migration tekrar uygulanmaz
      const day = await createWaterRepository(second.db).loadDay(D2);
      expect(day.totalMl).toBe(250);
      expect(day.goalMl).toBe(2000); // gün hedefi, ayar sonradan 3500 olsa da donmuş
      second.raw.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
