import { createTestDb } from '@/test/sqliteTestDb';
import { runMigrations } from '@/db/migrations';
import { createWaterRepository } from '@/db/waterRepository';
import { addWaterNow, AddWaterError, loadToday } from './waterService';

async function setup() {
  const t = createTestDb();
  await runMigrations(t.db);
  return { ...t, repo: createWaterRepository(t.db) };
}

describe('addWaterNow / loadToday', () => {
  it('kaydı şu anın yerel günü ve dakikasıyla ekler', async () => {
    const { repo } = await setup();
    const log = await addWaterNow(repo, 250, new Date(2026, 9, 2, 14, 30, 45));
    expect(log).toMatchObject({ localDate: '2026-10-02', minuteOfDay: 870, amountMl: 250 });
    const day = await loadToday(repo, new Date(2026, 9, 2, 15, 0));
    expect(day.totalMl).toBe(250);
  });

  it('gece yarısı geçince yeni gün sıfırdan başlar, önceki gün korunur', async () => {
    const { repo } = await setup();
    await addWaterNow(repo, 500, new Date(2026, 9, 2, 23, 59, 30));
    expect((await loadToday(repo, new Date(2026, 9, 2, 23, 59, 59))).totalMl).toBe(500);

    const after = new Date(2026, 9, 3, 0, 0, 1);
    expect((await loadToday(repo, after)).totalMl).toBe(0);
    await addWaterNow(repo, 150, after);
    expect((await loadToday(repo, after)).totalMl).toBe(150);
    expect((await repo.loadDay('2026-10-02')).totalMl).toBe(500);
  });

  it('00:00 kaydı yeni günün ilk dakikasına yazılır', async () => {
    const { repo } = await setup();
    const log = await addWaterNow(repo, 150, new Date(2026, 9, 3, 0, 0, 0));
    expect(log).toMatchObject({ localDate: '2026-10-03', minuteOfDay: 0 });
  });

  it('geçersiz miktarı veritabanına gitmeden reddeder', async () => {
    const { repo, raw } = await setup();
    for (const ml of [0, -150, 12.5, 99999, Number.NaN]) {
      await expect(addWaterNow(repo, ml, new Date(2026, 9, 2, 12, 0))).rejects.toBeInstanceOf(AddWaterError);
    }
    expect(raw.prepare('SELECT COUNT(*) AS n FROM water_logs').get()).toEqual({ n: 0 });
  });
});
