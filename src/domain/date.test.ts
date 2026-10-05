import {
  formatDayHeading,
  formatMinuteOfDay,
  formatMl,
  isValidDateKey,
  minuteOfDay,
  msUntilNextLocalMidnight,
  toLocalDateKey,
} from './date';

describe('toLocalDateKey', () => {
  it('yerel takvim gününü verir; gece yarısı sınırında doğru güne düşer', () => {
    expect(toLocalDateKey(new Date(2026, 9, 2, 0, 0, 0))).toBe('2026-10-02');
    expect(toLocalDateKey(new Date(2026, 9, 2, 23, 59, 59, 999))).toBe('2026-10-02');
    expect(toLocalDateKey(new Date(2026, 9, 3, 0, 0, 0))).toBe('2026-10-03');
  });

  it('ay ve yıl geçişlerinde ve sıfır dolgusunda doğru', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
    expect(toLocalDateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
    expect(toLocalDateKey(new Date(2027, 0, 1, 0, 0))).toBe('2027-01-01');
  });
});

describe('isValidDateKey', () => {
  it.each(['2026-10-02', '2024-02-29', '2000-01-01'])('%s geçerli', (k) => {
    expect(isValidDateKey(k)).toBe(true);
  });

  it.each(['2026-02-29', '2026-02-30', '2026-13-01', '2026-00-10', '2026-10-32', '2026-1-2', '26-10-02', '', ' 2026-10-02'])(
    '%j geçersiz',
    (k) => {
      expect(isValidDateKey(k)).toBe(false);
    },
  );

  it('string olmayan değerleri reddeder', () => {
    expect(isValidDateKey(undefined)).toBe(false);
    expect(isValidDateKey(null)).toBe(false);
    expect(isValidDateKey(20261002)).toBe(false);
  });
});

describe('günün dakikası ve biçimlendirme', () => {
  it('minuteOfDay', () => {
    expect(minuteOfDay(new Date(2026, 9, 2, 0, 0))).toBe(0);
    expect(minuteOfDay(new Date(2026, 9, 2, 14, 30))).toBe(870);
    expect(minuteOfDay(new Date(2026, 9, 2, 23, 59))).toBe(1439);
  });

  it('formatMinuteOfDay prototipteki gibi noktalı', () => {
    expect(formatMinuteOfDay(0)).toBe('00.00');
    expect(formatMinuteOfDay(870)).toBe('14.30');
    expect(formatMinuteOfDay(1439)).toBe('23.59');
  });

  it('formatDayHeading Türkçe', () => {
    expect(formatDayHeading(new Date(2026, 9, 2))).toBe('2 Ekim Cuma');
    expect(formatDayHeading(new Date(2026, 0, 1))).toBe('1 Ocak Perşembe');
  });

  it('formatMl binlik ayraç nokta', () => {
    expect(formatMl(0)).toBe('0');
    expect(formatMl(750)).toBe('750');
    expect(formatMl(2000)).toBe('2.000');
    expect(formatMl(12500)).toBe('12.500');
  });
});

describe('msUntilNextLocalMidnight', () => {
  it('gece yarısına 1 ms kala 1 döner', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 2, 23, 59, 59, 999))).toBe(1);
  });

  it('tam gece yarısında yeni günün sonuna (yaklaşık 24 saat) bakar, 0 dönmez', () => {
    const ms = msUntilNextLocalMidnight(new Date(2026, 9, 3, 0, 0, 0, 0));
    expect(ms).toBeGreaterThan(23 * 3600_000);
    expect(ms).toBeLessThanOrEqual(25 * 3600_000);
  });

  it('öğlen yaklaşık 12 saat', () => {
    const ms = msUntilNextLocalMidnight(new Date(2026, 9, 2, 12, 0, 0, 0));
    expect(ms).toBeGreaterThan(11 * 3600_000);
    expect(ms).toBeLessThan(13 * 3600_000);
  });
});
