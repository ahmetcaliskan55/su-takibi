import { createTestDb } from '@/test/sqliteTestDb';
import { MIGRATIONS, runMigrations } from './migrations';
import { createMutex } from './mutex';
import { createSettingsRepository, SettingsValidationError } from './settingsRepository';
import { createWaterRepository } from './waterRepository';

async function setup() {
  const t = await createTestDb();
  await runMigrations(t.db);
  const exclusive = createMutex();
  return { ...t, water: createWaterRepository(t.db, exclusive), settings: createSettingsRepository(t.db, exclusive) };
}
const prefs = { remindersEnabled: true, intervalMin: 120, wakeMin: 480, sleepMin: 1380, tone: 'komik' as const };

describe('migration v2', () => {
  it('Aşama 1–2 verisini korur; yeni ayarlar varsayılanla gelir, ilk kurulum bekler', async () => {
    const t = await createTestDb();
    // v1 şemasını elle kur ve veri yaz
    await runMigrations(t.db, MIGRATIONS.slice(0, 1));
    t.raw.prepare("INSERT INTO days (local_date, goal_ml) VALUES ('2026-10-02', 2000)").run();
    t.raw.prepare('INSERT INTO water_logs (local_date, minute_of_day, amount_ml, created_at) VALUES (?, 600, 250, 1)').run('2026-10-02');
    await runMigrations(t.db);
    const s = createSettingsRepository(t.db);
    const { settings, profile } = await s.load();
    expect(settings).toEqual({ dailyGoalMl: 2000, glassMl: 250, remindersEnabled: true, intervalMin: 120, wakeMin: 480, sleepMin: 1380, tone: 'komik', onboardingDone: false });
    expect(profile).toEqual({ age: null, weightKg: null, activity: null });
    expect(t.raw.prepare('SELECT COUNT(*) AS n FROM water_logs').get()).toEqual({ n: 1 });
  });
});

describe('eksik gün doldurma', () => {
  it('uygulama günlerce açılmayınca boş günler önceki günün hedefiyle, 0 ml olarak oluşur', async () => {
    const { water, settings, raw } = await setup();
    await water.loadDay('2026-10-01');
    await settings.setDailyGoal(2500, '2026-10-01');
    const day = await water.loadDay('2026-10-04');
    expect(day.goalMl).toBe(2500);
    const rows = raw.prepare('SELECT local_date, goal_ml FROM days ORDER BY local_date').all();
    expect(rows).toEqual([
      { local_date: '2026-10-01', goal_ml: 2500 },
      { local_date: '2026-10-02', goal_ml: 2500 },
      { local_date: '2026-10-03', goal_ml: 2500 },
      { local_date: '2026-10-04', goal_ml: 2500 },
    ]);
    expect((await water.loadDay('2026-10-03')).totalMl).toBe(0);
  });

  it('ay ve yıl sınırlarını geçer; mevcut günlere dokunmaz', async () => {
    const { water, raw } = await setup();
    await water.loadDay('2026-12-30');
    await water.loadDay('2027-01-02');
    const dates = (raw.prepare('SELECT local_date AS d FROM days ORDER BY local_date').all() as { d: string }[]).map((r) => r.d);
    expect(dates).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  });

  it('hiç gün yoksa yalnızca bugünü, ayardaki hedefle oluşturur', async () => {
    const { water, raw } = await setup();
    raw.prepare('UPDATE settings SET daily_goal_ml = 3000 WHERE id = 1').run();
    expect((await water.loadDay('2026-10-05')).goalMl).toBe(3000);
    expect(raw.prepare('SELECT COUNT(*) AS n FROM days').get()).toEqual({ n: 1 });
  });

  it('saat geriye alınırsa (eski bir gün istenirse) var olan günler korunur', async () => {
    const { water, raw } = await setup();
    await water.loadDay('2026-10-05');
    await water.loadDay('2026-10-03');
    expect(raw.prepare('SELECT COUNT(*) AS n FROM days').get()).toEqual({ n: 2 });
  });
});

describe('hedef değişikliği', () => {
  it('yalnızca bugünün hedefini ve ayarı günceller; geçmiş günler değişmez', async () => {
    const { water, settings } = await setup();
    await water.loadDay('2026-10-01');
    await water.addLog({ localDate: '2026-10-01', minuteOfDay: 600, amountMl: 1000 }, 1);
    await water.loadDay('2026-10-02');
    await settings.setDailyGoal(3000, '2026-10-02');
    expect((await water.loadDay('2026-10-01')).goalMl).toBe(2000);
    expect((await water.loadDay('2026-10-02')).goalMl).toBe(3000);
    expect((await water.loadDay('2026-10-03')).goalMl).toBe(3000); // yeni gün güncel hedefi taşır
    expect((await settings.load()).settings.dailyGoalMl).toBe(3000);
  });

  it('geçersiz hedefi reddeder ve hiçbir şeyi değiştirmez', async () => {
    const { settings } = await setup();
    for (const g of [499, 4001, 2500.5, Number.NaN]) {
      await expect(settings.setDailyGoal(g, '2026-10-02')).rejects.toBeInstanceOf(SettingsValidationError);
    }
    expect((await settings.load()).settings.dailyGoalMl).toBe(2000);
  });
});

describe('profil, bardak ve hatırlatma tercihi', () => {
  it('profil boş bırakılabilir ve geçerli değerler kaydolur', async () => {
    const { settings } = await setup();
    await settings.saveProfile({ age: 22, weightKg: 70, activity: 'orta' });
    expect((await settings.load()).profile).toEqual({ age: 22, weightKg: 70, activity: 'orta' });
    await settings.saveProfile({ age: null, weightKg: null, activity: null });
    expect((await settings.load()).profile).toEqual({ age: null, weightKg: null, activity: null });
  });

  it.each([{ age: 0 }, { age: 121 }, { weightKg: 19 }, { weightKg: 301 }, { age: 2.5 }, { activity: 'x' }])('geçersiz profil %j', async (patch) => {
    const { settings } = await setup();
    await expect(settings.saveProfile({ age: null, weightKg: null, activity: null, ...patch } as never)).rejects.toBeInstanceOf(SettingsValidationError);
  });

  it('gece yarısını aşan uyanıklık (08:00–01:00) kaydedilir; aynı saat reddedilir', async () => {
    const { settings } = await setup();
    await settings.saveReminderPrefs({ ...prefs, wakeMin: 480, sleepMin: 60 });
    expect((await settings.load()).settings).toMatchObject({ wakeMin: 480, sleepMin: 60 });
    await expect(settings.saveReminderPrefs({ ...prefs, wakeMin: 480, sleepMin: 480 })).rejects.toBeInstanceOf(SettingsValidationError);
  });

  it('bardak miktarı 50–2000 ml', async () => {
    const { settings } = await setup();
    await settings.setGlassAmount(330);
    expect((await settings.load()).settings.glassMl).toBe(330);
    await expect(settings.setGlassAmount(10)).rejects.toBeInstanceOf(SettingsValidationError);
  });
});

describe('completeOnboarding', () => {
  const input = { goalMl: 2500, glassMl: 330, profile: { age: null, weightKg: null, activity: null }, reminders: prefs, todayKey: '2026-10-02' };

  it('her şeyi tek seferde kaydeder ve bugünün hedefini günceller; mevcut kayıtlar korunur', async () => {
    const { settings, water } = await setup();
    await water.addLog({ localDate: '2026-10-02', minuteOfDay: 600, amountMl: 250 }, 1);
    await settings.completeOnboarding(input);
    const { settings: s } = await settings.load();
    expect(s).toMatchObject({ dailyGoalMl: 2500, glassMl: 330, onboardingDone: true });
    const day = await water.loadDay('2026-10-02');
    expect(day.goalMl).toBe(2500);
    expect(day.totalMl).toBe(250);
  });

  it('bir değer geçersizse hiçbir şey yazılmaz (ilk kurulum tamamlanmış sayılmaz)', async () => {
    const { settings } = await setup();
    await expect(settings.completeOnboarding({ ...input, glassMl: 5 })).rejects.toBeInstanceOf(SettingsValidationError);
    const { settings: s } = await settings.load();
    expect(s).toMatchObject({ dailyGoalMl: 2000, glassMl: 250, onboardingDone: false });
  });
});
