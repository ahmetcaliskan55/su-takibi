import { MESSAGES } from '@/domain/messages';
import { createMutex } from '@/db/mutex';
import { runMigrations } from '@/db/migrations';
import { createSettingsRepository } from '@/db/settingsRepository';
import { createWaterRepository } from '@/db/waterRepository';
import { createFakeDriver } from '@/test/fakeDriver';
import { createTestDb } from '@/test/sqliteTestDb';
import { createSerialRunner, syncReminders } from './sync';

const NOW = new Date(2026, 9, 5, 9, 0, 0); // Pzt 09:00
const TODAY = '2026-10-05';

async function setup(opts: { onboarded?: boolean; enabled?: boolean } = {}) {
  const t = await createTestDb();
  await runMigrations(t.db);
  const exclusive = createMutex();
  const water = createWaterRepository(t.db, exclusive);
  const settings = createSettingsRepository(t.db, exclusive);
  if (opts.onboarded !== false) {
    await settings.completeOnboarding({
      goalMl: 2000,
      glassMl: 250,
      profile: { age: null, weightKg: null, activity: null },
      reminders: { remindersEnabled: opts.enabled !== false, intervalMin: 120, wakeMin: 480, sleepMin: 1380, tone: 'komik' },
      todayKey: TODAY,
    });
  }
  const driver = createFakeDriver();
  const run = () => syncReminders({ driver, water, settings, now: NOW });
  return { water, settings, driver, run };
}

const time = (d: Date) => `${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('syncReminders', () => {
  it('izin verilmişse eski planı iptal edip yenisini oluşturur (kanal önce)', async () => {
    const { driver, run } = await setup();
    const res = await run();
    expect(res.reason).toBe('scheduled');
    expect(res.scheduled).toBeGreaterThan(0);
    expect(driver.calls.slice(0, 4)).toEqual(['get', 'channel', 'cancel', `schedule:${res.scheduled}`]);
    expect(driver.scheduled).toHaveLength(res.scheduled);
    expect(time(driver.scheduled[0]!.fireAt)).toBe('5 10:00'); // kayıt yok: uyanma 08:00 + 2 saat geçmişte kalanlar atlanır
  });

  it('art arda çalıştırmak yinelenen bildirim bırakmaz', async () => {
    const { driver, run } = await setup();
    await run();
    const first = driver.scheduled.map((p) => p.id);
    await run();
    await run();
    expect(driver.scheduled.map((p) => p.id)).toEqual(first);
  });

  it('hatırlatmalar kapalıyken ya da ilk kurulum bitmemişken yalnızca iptal eder', async () => {
    const off = await setup({ enabled: false });
    expect((await off.run()).reason).toBe('disabled');
    expect(off.driver.calls).toContain('cancel');
    expect(off.driver.scheduled).toEqual([]);
    const fresh = await setup({ onboarded: false });
    expect((await fresh.run()).reason).toBe('disabled');
    expect(fresh.driver.scheduled).toEqual([]);
  });

  it('izin yoksa hiçbir şey planlanmaz (uygulama izinsiz de çalışır)', async () => {
    const { driver, run } = await setup();
    driver.setPermission({ state: 'denied', canAskAgain: false });
    const res = await run();
    expect(res).toEqual({ reason: 'no-permission', scheduled: 0 });
    expect(driver.scheduled).toEqual([]);
    expect(driver.calls.some((c) => c.startsWith('schedule'))).toBe(false);
  });

  it('su kaydı eklenince sayım o kayıttan başlar; silince eski plana döner', async () => {
    const { water, driver, run } = await setup();
    await run();
    expect(time(driver.scheduled[0]!.fireAt)).toBe('5 10:00');
    const log = await water.addLog({ localDate: TODAY, minuteOfDay: 9 * 60 - 1, amountMl: 250 }, 1); // 08:59
    await run();
    expect(time(driver.scheduled[0]!.fireAt)).toBe('5 10:59');
    expect(driver.scheduled[0]!.level).toBe(1);
    await water.deleteLog(log.id);
    await run();
    expect(time(driver.scheduled[0]!.fireAt)).toBe('5 10:00');
  });

  it('günlük hedef tamamlanınca bugünün hatırlatmaları kalkar, yarınınkiler kalır; kayıt silinince geri gelir', async () => {
    const { water, driver, run } = await setup();
    const a = await water.addLog({ localDate: TODAY, minuteOfDay: 8 * 60 + 30, amountMl: 2000 }, 1);
    await run();
    expect(driver.scheduled.length).toBeGreaterThan(0);
    expect(driver.scheduled.every((p) => p.fireAt.getDate() >= 6)).toBe(true);
    await water.deleteLog(a.id);
    await run();
    expect(driver.scheduled.some((p) => p.fireAt.getDate() === 5)).toBe(true);
  });

  it('ayar değişince (aralık, saatler, tarz) plan buna göre yenilenir', async () => {
    const { settings, driver, run } = await setup();
    await run();
    await settings.saveReminderPrefs({ remindersEnabled: true, intervalMin: 60, wakeMin: 480, sleepMin: 60, tone: 'nazik' });
    await run();
    expect(time(driver.scheduled[0]!.fireAt)).toBe('5 10:00');
    expect(driver.scheduled[1]!.fireAt.getTime() - driver.scheduled[0]!.fireAt.getTime()).toBe(3_600_000);
    expect(driver.scheduled.some((p) => p.fireAt.getDate() === 6 && p.fireAt.getHours() === 0)).toBe(true); // gece yarısını aşan uyanıklık
    expect([...MESSAGES.nazik.rem, ...MESSAGES.nazik.alt]).toContain(driver.scheduled[0]!.body); // seçilen tona uyar
    expect(driver.scheduled.every((p) => !(p.fireAt.getHours() >= 1 && p.fireAt.getHours() < 8))).toBe(true);
  });

  it('bildirim sayısı iOS sınırının altında kalır', async () => {
    const { settings, driver, run } = await setup();
    await settings.saveReminderPrefs({ remindersEnabled: true, intervalMin: 60, wakeMin: 60, sleepMin: 0, tone: 'komik' });
    await run();
    expect(driver.scheduled.length).toBeLessThan(64);
  });
});

describe('createSerialRunner', () => {
  it('aynı anda tek çalışır; bekleyen istekler tek bir ek çalıştırmaya birleşir', async () => {
    let active = 0;
    let maxActive = 0;
    let runs = 0;
    const gate: { release: () => void } = { release: () => undefined };
    const slow = createSerialRunner(async () => {
      runs += 1;
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((r) => (gate.release = r));
      active -= 1;
    });
    const p1 = slow();
    const p2 = slow();
    const p3 = slow();
    const p4 = slow();
    gate.release();
    await Promise.resolve();
    await Promise.resolve();
    gate.release();
    await Promise.all([p1, p2, p3, p4]);
    expect(maxActive).toBe(1);
    expect(runs).toBe(2);
  });

  it('görev hata verse de kilitlenmez; sonraki istek çalışır', async () => {
    let n = 0;
    const run = createSerialRunner(async () => {
      n += 1;
      if (n === 1) throw new Error('x');
    });
    await run();
    await run();
    expect(n).toBe(2);
  });
});
