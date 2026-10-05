import { createTestDb } from '@/test/sqliteTestDb';
import { runMigrations } from '@/db/migrations';
import { createWaterRepository } from '@/db/waterRepository';
import { addWater, addWaterNow, AddWaterError, deleteWater, editWater, loadToday, undoWater } from './waterService';

async function setup() {
  const t = await createTestDb();
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

describe('addWater (özel saat)', () => {
  const NOW = new Date(2026, 9, 2, 16, 30, 10);

  it('verilen saatle ekler', async () => {
    const { repo } = await setup();
    const log = await addWater(repo, { amountMl: 300, minuteOfDay: 8 * 60 }, NOW);
    expect(log).toMatchObject({ localDate: '2026-10-02', minuteOfDay: 480, amountMl: 300 });
  });

  it('gelecekteki saati ve aralık dışı miktarı reddeder, hiçbir şey yazmaz', async () => {
    const { repo, raw } = await setup();
    await expect(addWater(repo, { amountMl: 250, minuteOfDay: 16 * 60 + 31 }, NOW)).rejects.toMatchObject({ reason: 'time_in_future' });
    await expect(addWater(repo, { amountMl: 3900, minuteOfDay: 600 }, NOW)).rejects.toMatchObject({ reason: 'amount_too_large' });
    await expect(addWater(repo, { amountMl: -1, minuteOfDay: 600 }, NOW)).rejects.toBeInstanceOf(AddWaterError);
    expect(raw.prepare('SELECT COUNT(*) AS n FROM water_logs').get()).toEqual({ n: 0 });
  });
});

describe('editWater / deleteWater / undoWater', () => {
  const NOW = new Date(2026, 9, 2, 16, 30);

  it('düzenleme önce/sonra hâlini döndürür; geçersiz düzenleme kaydı değiştirmez', async () => {
    const { repo } = await setup();
    const log = await addWater(repo, { amountMl: 2000, minuteOfDay: 600 }, NOW);
    await expect(editWater(repo, log.id, { amountMl: 250, minuteOfDay: 17 * 60 }, NOW)).rejects.toMatchObject({ reason: 'time_in_future' });
    expect(await repo.getLog(log.id)).toEqual(log);
    const res = await editWater(repo, log.id, { amountMl: 250, minuteOfDay: 601 }, NOW);
    expect(res.before).toEqual(log);
    expect(res.after).toMatchObject({ amountMl: 250, minuteOfDay: 601 });
  });

  it('başka günün kaydı düzenlenemez', async () => {
    const { repo } = await setup();
    const old = await repo.addLog({ localDate: '2026-10-01', minuteOfDay: 600, amountMl: 250 }, 1);
    await expect(editWater(repo, old.id, { amountMl: 300, minuteOfDay: 600 }, NOW)).rejects.toMatchObject({ reason: 'not_today' });
  });

  it('olmayan kaydı düzenlemek LogNotFoundError verir', async () => {
    const { repo } = await setup();
    await expect(editWater(repo, 123, { amountMl: 250, minuteOfDay: 60 }, NOW)).rejects.toMatchObject({ name: 'LogNotFoundError' });
  });

  it('geri alma yalnızca ilgili işlemi tersine çevirir', async () => {
    const { repo } = await setup();
    const a = await addWater(repo, { amountMl: 250, minuteOfDay: 500 }, NOW);
    const b = await addWater(repo, { amountMl: 500, minuteOfDay: 600 }, NOW);

    await undoWater(repo, { kind: 'add', log: b });
    expect((await loadToday(repo, NOW)).logs).toEqual([a]);

    const edit = await editWater(repo, a.id, { amountMl: 150, minuteOfDay: 510 }, NOW);
    await undoWater(repo, { kind: 'edit', ...edit });
    expect(await repo.getLog(a.id)).toEqual(a);

    const removed = await deleteWater(repo, a.id);
    expect((await loadToday(repo, NOW)).totalMl).toBe(0);
    await undoWater(repo, { kind: 'delete', log: removed });
    expect(await repo.getLog(a.id)).toEqual(a);
  });
});
