import { addDaysToKey, weekdayIndexMon0 } from './date';
import { barHeight, buildCalendarPage, computeStats, dayPercent, dayPlant, dayStatus, hasEarlierPage, lastNDays } from './history';

describe('tarih yardımcıları', () => {
  it('addDaysToKey ay/yıl sınırlarını ve gerisini doğru geçer', () => {
    expect(addDaysToKey('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysToKey('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDaysToKey('2024-02-28', 2)).toBe('2024-03-01');
    expect(addDaysToKey('2026-10-02', -35)).toBe('2026-08-28');
  });
  it('Pazartesi = 0', () => {
    expect(weekdayIndexMon0('2026-10-05')).toBe(0); // Pazartesi
    expect(weekdayIndexMon0('2026-10-02')).toBe(4); // Cuma
    expect(weekdayIndexMon0('2026-10-04')).toBe(6); // Pazar
  });
});

describe('gün durumu ve bitki (dondurulmuş hedefle)', () => {
  it('durumlar', () => {
    expect(dayStatus(0, 2000)).toBe('zero');
    expect(dayStatus(1, 2000)).toBe('part');
    expect(dayStatus(1999, 2000)).toBe('part');
    expect(dayStatus(2000, 2000)).toBe('done');
    expect(dayStatus(5000, 2000)).toBe('done');
  });
  it('aynı toplam farklı günün hedefiyle farklı bitki verir; hedef üstü çiçekte kalır', () => {
    expect(dayPlant({ localDate: 'a', goalMl: 2000, totalMl: 1000 })).toBe(2);
    expect(dayPlant({ localDate: 'b', goalMl: 4000, totalMl: 1000 })).toBe(1);
    expect(dayPlant({ localDate: 'c', goalMl: 2000, totalMl: 9000 })).toBe(4);
    expect(dayPercent({ localDate: 'c', goalMl: 2000, totalMl: 9000 })).toBe(100);
  });
});

describe('buildCalendarPage', () => {
  const TODAY = '2026-10-02'; // Cuma

  it('sayfa 0: 35 gün, Pazartesi ile başlar, son hafta bugünü içerir', () => {
    const p = buildCalendarPage(TODAY, 0);
    expect(p.cells).toHaveLength(35);
    expect(p.startKey).toBe('2026-08-31'); // Pazartesi
    expect(p.endKey).toBe('2026-10-04'); // Pazar
    expect(p.cells[0]!.dateKey).toBe('2026-08-31');
    expect(weekdayIndexMon0(p.startKey)).toBe(0);
    expect(p.rangeLabel).toBe('31 Ağu – 4 Eki');
  });

  it('bugünü işaretler; sonraki günler gelecek; ayın 1\'i ay kısaltmasıyla', () => {
    const p = buildCalendarPage(TODAY, 0);
    const today = p.cells.find((c) => c.isToday)!;
    expect(today.dateKey).toBe(TODAY);
    expect(p.cells.filter((c) => c.isFuture).map((c) => c.dateKey)).toEqual(['2026-10-03', '2026-10-04']);
    expect(p.cells.find((c) => c.dateKey === '2026-10-01')!.label).toBe('1 Eki');
    expect(p.cells.find((c) => c.dateKey === '2026-09-30')!.label).toBe('30');
  });

  it('önceki sayfa tam 35 gün öncesidir ve kesişmez; hiçbiri gelecek değil', () => {
    const p0 = buildCalendarPage(TODAY, 0);
    const p1 = buildCalendarPage(TODAY, -1);
    expect(p1.endKey).toBe(addDaysToKey(p0.startKey, -1));
    expect(p1.cells.some((c) => c.isFuture || c.isToday)).toBe(false);
  });

  it('bugün Pazartesi / Pazar iken de hizalı', () => {
    expect(buildCalendarPage('2026-10-05', 0).cells[28]!.dateKey).toBe('2026-10-05');
    expect(buildCalendarPage('2026-10-04', 0).endKey).toBe('2026-10-04');
  });

  it('hasEarlierPage', () => {
    expect(hasEarlierPage(null, '2026-09-07')).toBe(false);
    expect(hasEarlierPage('2026-09-07', '2026-09-07')).toBe(false);
    expect(hasEarlierPage('2026-09-06', '2026-09-07')).toBe(true);
  });
});

describe('computeStats', () => {
  const TODAY = '2026-10-05';
  const rows = [
    { localDate: '2026-10-01', goalMl: 2000, totalMl: 2000 },
    { localDate: '2026-10-02', goalMl: 2000, totalMl: 1000 },
    { localDate: '2026-10-03', goalMl: 3000, totalMl: 0 },
    { localDate: '2026-10-05', goalMl: 3000, totalMl: 3500 },
  ];

  it('lastNDays eskiden yeniye ve bugün dahil', () => {
    expect(lastNDays(TODAY, 3)).toEqual(['2026-10-03', '2026-10-04', '2026-10-05']);
    expect(lastNDays(TODAY, 7)[0]).toBe('2026-09-29');
  });

  it('sayımlar, ortalama ve "veri yok" ayrımı', () => {
    const s = computeStats(lastNDays(TODAY, 7), rows, TODAY);
    expect(s.counts).toEqual({ done: 2, part: 1, zero: 1, none: 3 }); // 29,30 ve 4 Ekim satırsız → 3 veri yok
    expect(s.doneCount).toBe(2);
    expect(s.averageMl).toBe(Math.round((2000 + 1000 + 0 + 3500) / 4)); // veri yoksa ortalamaya girmez, 0 ml girer
    expect(s.bars.map((b) => b.kind)).toEqual(['none', 'none', 'done', 'part', 'zero', 'none', 'done']);
    expect(s.bars[6]!.isToday).toBe(true);
  });

  it('her çubuk kendi günün hedefini taşır (geçmiş hedefler değişmez)', () => {
    const s = computeStats(lastNDays(TODAY, 7), rows, TODAY);
    expect(s.bars.map((b) => b.goalMl)).toEqual([null, null, 2000, 2000, 3000, null, 3000]);
  });

  it('hiç veri yoksa ortalama null; tavan en az 2.500', () => {
    const s = computeStats(lastNDays(TODAY, 7), [], TODAY);
    expect(s.averageMl).toBeNull();
    expect(s.counts.none).toBe(7);
    expect(s.chartMax).toBe(2500);
  });

  it('tavan en yüksek günlük hedefin 1,25 katı (2.500 üstünde)', () => {
    expect(computeStats(['2026-10-01'], [{ localDate: '2026-10-01', goalMl: 4000, totalMl: 100 }], TODAY).chartMax).toBe(5000);
  });

  it('barHeight: 0 ml → 0, az ama var → en az 6 px, tavanı aşan tavanda', () => {
    expect(barHeight(0, 2500, 132)).toBe(0);
    expect(barHeight(10, 2500, 132)).toBe(6);
    expect(barHeight(1250, 2500, 132)).toBe(66);
    expect(barHeight(9999, 2500, 132)).toBe(132);
  });
});
