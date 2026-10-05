import { MESSAGES } from './messages';
import { awakeWindow, DEFAULT_MAX_SCHEDULED, planReminders, reminderBody, type PlanInput } from './reminders';

const at = (d: string, h: number, m = 0) => {
  const [y, mo, da] = d.split('-').map(Number) as [number, number, number];
  return new Date(y, mo - 1, da, h, m, 0, 0);
};
const hhmm = (d: Date) => `${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const base = (
  over: { now?: Date; settings?: Partial<PlanInput['settings']>; completedDates?: string[]; lastLogAt?: Date | null; horizonDays?: number; maxScheduled?: number } = {},
): PlanInput => ({
  now: over.now ?? at('2026-10-05', 9, 0),
  settings: { enabled: true, intervalMin: 120, wakeMin: 480, sleepMin: 1380, tone: 'komik', ...over.settings },
  completedDates: over.completedDates ?? [],
  lastLogAt: over.lastLogAt ?? null,
  horizonDays: over.horizonDays ?? 1,
  maxScheduled: over.maxScheduled,
});
const reminders = (p: ReturnType<typeof planReminders>) => p.filter((x) => x.kind === 'reminder');

describe('awakeWindow', () => {
  it('aynı gün içinde ve gece yarısını aşan pencere', () => {
    const a = awakeWindow('2026-10-05', 480, 1380);
    expect([hhmm(a.start), hhmm(a.end)]).toEqual(['05 08:00', '05 23:00']);
    const b = awakeWindow('2026-10-05', 480, 60); // 08:00 – 01:00
    expect([hhmm(b.start), hhmm(b.end)]).toEqual(['05 08:00', '06 01:00']);
  });
});

describe('planReminders', () => {
  it('kayıt yokken uyanma saatinden itibaren her 2 saatte; yalnızca uyanık saatler; seviye 1-2-3-4-4', () => {
    const plan = reminders(planReminders(base({ now: at('2026-10-05', 7, 0) })));
    expect(plan.map((p) => hhmm(p.fireAt))).toEqual(['05 10:00', '05 12:00', '05 14:00', '05 16:00', '05 18:00', '05 20:00', '05 22:00']);
    expect(plan.map((p) => p.level)).toEqual([1, 2, 3, 4, 4, 4, 4]);
    expect(plan.every((p) => p.fireAt.getHours() >= 8 && p.fireAt < at('2026-10-05', 23, 0))).toBe(true);
  });

  it('son kayıttan itibaren sayar ve seviye 1\'e döner', () => {
    const plan = reminders(planReminders(base({ lastLogAt: at('2026-10-05', 9, 30) })));
    expect(hhmm(plan[0]!.fireAt)).toBe('05 11:30');
    expect(plan[0]!.level).toBe(1);
  });

  it('geçmiş zamanlar planlanmaz ama seviye gerçek süreyi yansıtır', () => {
    const plan = reminders(planReminders(base({ now: at('2026-10-05', 15, 0) })));
    expect(plan[0]!.fireAt).toEqual(at('2026-10-05', 16, 0));
    expect(plan[0]!.level).toBe(4); // uyanmadan 8 saat geçti
  });

  it('kapalıyken ve geçersiz ayarda boş', () => {
    expect(planReminders(base({ settings: { enabled: false } }))).toEqual([]);
    expect(planReminders(base({ settings: { wakeMin: 480, sleepMin: 480 } }))).toEqual([]);
  });

  it('bugünün hedefi tamamlandıysa bugün susar, ertesi gün devam eder', () => {
    const plan = reminders(planReminders(base({ horizonDays: 2, completedDates: ['2026-10-05'] })));
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.every((p) => p.fireAt.getDate() === 6)).toBe(true);
    expect(hhmm(plan[0]!.fireAt)).toBe('06 10:00'); // yarın uyanma + aralık
    expect(plan[0]!.level).toBe(1);
  });

  it('gece yarısını aşan uyanıklıkta (08:00–01:00) gece 00:00–01:00 hatırlatmaları gelir; sessiz saatlerde gelmez', () => {
    const plan = reminders(planReminders(base({ now: at('2026-10-05', 21, 0), horizonDays: 2, settings: { sleepMin: 60, intervalMin: 60 } })));
    const times = plan.map((p) => hhmm(p.fireAt));
    expect(times.slice(0, 4)).toEqual(['05 22:00', '05 23:00', '06 00:00', '06 09:00']); // 01:00 sınırı dahil değil; 01:00–08:00 sessiz
    expect(plan.some((p) => p.fireAt.getHours() >= 1 && p.fireAt.getHours() < 8)).toBe(false);
  });

  it('gece yarısı sonrası kuyrukta dünün hedefi tamamlandıysa o kuyruk susar', () => {
    const input = base({ now: at('2026-10-06', 0, 10), settings: { sleepMin: 120, intervalMin: 30 }, completedDates: ['2026-10-05'] });
    const plan = reminders(planReminders(input));
    expect(plan.some((p) => p.fireAt.getDate() === 6 && p.fireAt.getHours() < 8)).toBe(false);
    const notDone = reminders(planReminders({ ...input, completedDates: [] }));
    expect(notDone.some((p) => p.fireAt.getDate() === 6 && p.fireAt.getHours() < 2)).toBe(true);
  });

  it('1 saatlik ve 4 saatlik aralık', () => {
    const one = reminders(planReminders(base({ now: at('2026-10-05', 7, 0), settings: { intervalMin: 60 } })));
    expect(one).toHaveLength(14); // 09:00 … 22:00
    const four = reminders(planReminders(base({ now: at('2026-10-05', 7, 0), settings: { intervalMin: 240 } })));
    expect(four.map((p) => hhmm(p.fireAt))).toEqual(['05 12:00', '05 16:00', '05 20:00']);
  });

  it('sayı sınırı aşılmaz; sona tek bir duraklama bildirimi eklenir', () => {
    const plan = planReminders(base({ now: at('2026-10-05', 7, 0), horizonDays: 10, settings: { intervalMin: 60 } }));
    expect(plan.length).toBeLessThanOrEqual(DEFAULT_MAX_SCHEDULED);
    expect(plan.filter((p) => p.kind === 'pause')).toHaveLength(1);
    const pause = plan[plan.length - 1]!;
    expect(pause.kind).toBe('pause');
    expect(pause.fireAt.getTime()).toBeGreaterThan(plan[plan.length - 2]!.fireAt.getTime());
    expect(planReminders(base({ maxScheduled: 5, horizonDays: 5 }))).toHaveLength(5);
  });

  it('plan zamana göre sıralı, kimlikler benzersiz, hepsi gelecekte', () => {
    const input = base({ horizonDays: 3 });
    const plan = planReminders(input);
    const times = plan.map((p) => p.fireAt.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(new Set(plan.map((p) => p.id)).size).toBe(plan.length);
    expect(times.every((t) => t > input.now.getTime())).toBe(true);
  });

  it('hatırlatma yoksa (her şey geçmiş/tamam) duraklama bildirimi de yok', () => {
    expect(planReminders(base({ now: at('2026-10-05', 23, 30), horizonDays: 1 }))).toEqual([]);
  });

  it('mesajlar seçilen tona uyar; hakaret/suçlama yok (örnek metinler)', () => {
    const komik = reminders(planReminders(base({ now: at('2026-10-05', 7, 0), horizonDays: 1 })));
    const nazik = reminders(planReminders(base({ now: at('2026-10-05', 7, 0), horizonDays: 1, settings: { tone: 'nazik' } })));
    expect(komik[0]!.body).not.toBe(nazik[0]!.body);
    expect(komik.every((p) => p.title === 'Yudumla' && p.body.length > 0)).toBe(true);
  });
});

describe('reminderBody', () => {
  it('seviye 4\'ten sonra son seviye; alternatif dönüşümlü', () => {
    const d = at('2026-10-05', 10);
    expect(reminderBody('komik', 99, d)).toBe(MESSAGES.komik.rem[3]); // 5 + 99 çift → ana metin, son seviye
    expect(reminderBody('komik', 99, at('2026-10-06', 10))).toBe(MESSAGES.komik.alt[3]);
    const a = reminderBody('komik', 1, at('2026-10-05', 10)); // (5+1)%2=0 → ana
    const b = reminderBody('komik', 1, at('2026-10-06', 10)); // (6+1)%2=1 → alternatif
    expect(a).toBe('Su molası! Saksı hazır, bardak nerede? 🌱');
    expect(b).toBe('Yudum molası! Toprağım hazır, sıra sende 🌱');
  });
});
