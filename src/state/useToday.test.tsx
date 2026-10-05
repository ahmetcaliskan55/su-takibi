import { act, renderHook } from '@testing-library/react-native';
import { createTestDb } from '@/test/sqliteTestDb';
import { runMigrations } from '@/db/migrations';
import { createWaterRepository, type WaterRepository } from '@/db/waterRepository';
import { FORM_MESSAGES } from '@/domain/logForm';
import { SAVE_FAILED, UNDO_TOAST_MS, useToday } from './useToday';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const flush = () =>
  act(async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve();
  });

async function setup(wrap?: (repo: WaterRepository) => WaterRepository) {
  const t = await createTestDb();
  await runMigrations(t.db);
  let repo = createWaterRepository(t.db);
  if (wrap) repo = wrap(repo);
  jest.useFakeTimers({ now: new Date(2026, 9, 2, 16, 30, 0), doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
  const hook = renderHook(() => useToday(repo));
  await flush();
  return { ...hook, repo, raw: t.raw };
}

const total = (r: { current: ReturnType<typeof useToday> }) =>
  r.current.state.status === 'ready' ? r.current.state.day.totalMl : -1;

afterEach(() => jest.useRealTimers());

describe('useToday işlemleri', () => {
  it('başarılı ekleme toplamı günceller, "Geri al" bildirimi gösterir ve 7 sn sonra kaldırır', async () => {
    const { result } = await setup();
    expect(total(result)).toBe(0);
    await act(async () => void (await result.current.submitLog({ amountMl: 300, minuteOfDay: 600 }, null)));
    expect(total(result)).toBe(300);
    expect(result.current.toast?.message).toBe('300 ml eklendi');

    await act(async () => void jest.advanceTimersByTime(UNDO_TOAST_MS - 1));
    expect(result.current.toast).not.toBeNull();
    await act(async () => void jest.advanceTimersByTime(2));
    expect(result.current.toast).toBeNull();
  });

  it('veritabanı yazması başarısızsa başarı bildirimi yok, toplam değişmez, hata mesajı döner', async () => {
    const { result } = await setup((r) => ({ ...r, addLog: () => Promise.reject(new Error('disk dolu')) }));
    let res!: Awaited<ReturnType<typeof result.current.submitLog>>;
    await act(async () => void (res = await result.current.submitLog({ amountMl: 300, minuteOfDay: 600 }, null)));
    expect(res).toEqual({ ok: false, message: SAVE_FAILED });
    expect(result.current.toast).toBeNull();
    expect(total(result)).toBe(0);
  });

  it('hızlı eklemede yazma başarısızsa hata görünür, bildirim yok', async () => {
    const { result } = await setup((r) => ({ ...r, addLog: () => Promise.reject(new Error('x')) }));
    await act(async () => void (await result.current.addQuick(250)));
    expect(result.current.actionError).toBe(SAVE_FAILED);
    expect(result.current.toast).toBeNull();
  });

  it('yazma başarılı ama yeniden okuma başarısızsa başarı bildirimi gösterilmez', async () => {
    let failReads = false;
    const { result } = await setup((r) => ({
      ...r,
      loadDay: (d) => (failReads ? Promise.reject(new Error('okuma')) : r.loadDay(d)),
    }));
    failReads = true;
    await act(async () => void (await result.current.submitLog({ amountMl: 250, minuteOfDay: 600 }, null)));
    expect(result.current.toast).toBeNull();
  });

  it('gelecekteki saat ve geçersiz miktar veritabanına gitmeden reddedilir', async () => {
    const { result, raw } = await setup();
    let res!: Awaited<ReturnType<typeof result.current.submitLog>>;
    await act(async () => void (res = await result.current.submitLog({ amountMl: 250, minuteOfDay: 16 * 60 + 31 }, null)));
    expect(res).toEqual({ ok: false, message: FORM_MESSAGES.timeFuture });
    await act(async () => void (res = await result.current.submitLog({ amountMl: -5, minuteOfDay: 600 }, null)));
    expect(res.ok).toBe(false);
    expect(raw.prepare('SELECT COUNT(*) AS n FROM water_logs').get()).toEqual({ n: 0 });
    expect(result.current.toast).toBeNull();
  });

  it('aynı işlemi art arda göndermek tek kayıt oluşturur', async () => {
    const { result } = await setup();
    await act(async () => {
      const p1 = result.current.submitLog({ amountMl: 250, minuteOfDay: 600 }, null);
      const p2 = result.current.submitLog({ amountMl: 250, minuteOfDay: 600 }, null);
      await Promise.all([p1, p2]);
    });
    expect(total(result)).toBe(250);
  });

  it('düzenleme ve silme toplamı günceller; her ikisi de geri alınabilir', async () => {
    const { result } = await setup();
    await act(async () => void (await result.current.submitLog({ amountMl: 2000, minuteOfDay: 600 }, null)));
    const id = result.current.state.status === 'ready' ? result.current.state.day.logs[0]!.id : -1;

    jest.advanceTimersByTime(1000); // tekrar koruma süresi geçsin
    await act(async () => void (await result.current.submitLog({ amountMl: 250, minuteOfDay: 601 }, id)));
    expect(total(result)).toBe(250);
    expect(result.current.toast?.message).toBe('Kayıt güncellendi');
    await act(async () => void (await result.current.undo(result.current.toast!.token)));
    expect(total(result)).toBe(2000);

    jest.advanceTimersByTime(1000);
    await act(async () => void (await result.current.removeLog(id)));
    expect(total(result)).toBe(0);
    expect(result.current.toast?.message).toBe('Kayıt silindi');
    await act(async () => void (await result.current.undo(result.current.toast!.token)));
    expect(total(result)).toBe(2000);
    expect(result.current.toast).toBeNull();
  });

  it('geri al yalnızca son işlemi geri alır; eski bildirim hiçbir şey yapmaz', async () => {
    const { result } = await setup();
    await act(async () => void (await result.current.submitLog({ amountMl: 250, minuteOfDay: 500 }, null)));
    const firstToken = result.current.toast!.token;
    jest.advanceTimersByTime(1000);
    await act(async () => void (await result.current.submitLog({ amountMl: 500, minuteOfDay: 600 }, null)));
    expect(total(result)).toBe(750);

    let stale!: Awaited<ReturnType<typeof result.current.undo>>;
    await act(async () => void (stale = await result.current.undo(firstToken)));
    expect(stale).toEqual({ ok: false, message: null });
    expect(total(result)).toBe(750);

    await act(async () => void (await result.current.undo(result.current.toast!.token)));
    expect(total(result)).toBe(250); // yalnızca 500 ml'lik son ekleme geri alındı
  });

  it('geri alma başarısızsa hata gösterir ve başarı mesajı üretmez', async () => {
    const { result } = await setup((r) => ({ ...r, deleteLog: () => Promise.reject(new Error('x')) }));
    await act(async () => void (await result.current.submitLog({ amountMl: 250, minuteOfDay: 500 }, null)));
    await act(async () => void (await result.current.undo(result.current.toast!.token)));
    expect(result.current.actionError).toContain('Geri alınamadı');
    expect(total(result)).toBe(250);
  });
});
