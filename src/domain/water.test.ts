import {
  sumAmounts,
  validateAmount,
  validateGoal,
  validateMinuteOfDay,
  validateNewLog,
} from './water';

describe('validateAmount', () => {
  it.each([10, 150, 250, 500, 2000])('%i geçerli', (n) => {
    expect(validateAmount(n)).toEqual({ ok: true, value: n });
  });

  it.each([
    [0, 'amount_too_small'],
    [9, 'amount_too_small'],
    [-250, 'amount_too_small'],
    [2001, 'amount_too_large'],
    [5000, 'amount_too_large'],
    [250.5, 'amount_not_integer'],
    [Number.NaN, 'amount_not_integer'],
    [Number.POSITIVE_INFINITY, 'amount_not_integer'],
    ['250', 'amount_not_integer'],
    [null, 'amount_not_integer'],
    [undefined, 'amount_not_integer'],
  ])('%j reddedilir (%s)', (value, reason) => {
    expect(validateAmount(value)).toEqual({ ok: false, reason });
  });
});

describe('validateMinuteOfDay', () => {
  it.each([0, 1, 870, 1439])('%i geçerli', (m) => {
    expect(validateMinuteOfDay(m).ok).toBe(true);
  });

  it.each([-1, 1440, 12.5, Number.NaN, '60', null])('%j reddedilir', (m) => {
    expect(validateMinuteOfDay(m)).toEqual({ ok: false, reason: 'minute_invalid' });
  });
});

describe('validateGoal', () => {
  it('500–4000 tam sayı kabul, dışı red', () => {
    expect(validateGoal(500).ok).toBe(true);
    expect(validateGoal(2000).ok).toBe(true);
    expect(validateGoal(4000).ok).toBe(true);
    expect(validateGoal(499).ok).toBe(false);
    expect(validateGoal(4001).ok).toBe(false);
    expect(validateGoal(2000.5).ok).toBe(false);
    expect(validateGoal(Number.NaN).ok).toBe(false);
  });
});

describe('validateNewLog', () => {
  const today = '2026-10-02';
  const nowMinute = 16 * 60 + 30;

  it('bugün ve geçmiş saat kabul; tam şu anki dakika da kabul', () => {
    const earlier = { localDate: today, minuteOfDay: 480, amountMl: 250 };
    expect(validateNewLog(earlier, today, nowMinute)).toEqual({ ok: true, value: earlier });
    const exact = { localDate: today, minuteOfDay: nowMinute, amountMl: 250 };
    expect(validateNewLog(exact, today, nowMinute).ok).toBe(true);
  });

  it('gelecekteki saati reddeder', () => {
    const r = validateNewLog({ localDate: today, minuteOfDay: nowMinute + 1, amountMl: 250 }, today, nowMinute);
    expect(r).toEqual({ ok: false, reason: 'time_in_future' });
  });

  it('bugünden başka bir günü (geçmiş ya da gelecek) reddeder', () => {
    expect(validateNewLog({ localDate: '2026-10-01', minuteOfDay: 60, amountMl: 250 }, today, nowMinute)).toEqual({
      ok: false,
      reason: 'not_today',
    });
    expect(validateNewLog({ localDate: '2026-10-03', minuteOfDay: 60, amountMl: 250 }, today, nowMinute)).toEqual({
      ok: false,
      reason: 'not_today',
    });
  });

  it('geçersiz tarih biçimini reddeder', () => {
    expect(validateNewLog({ localDate: '2026-02-30', minuteOfDay: 60, amountMl: 250 }, today, nowMinute)).toEqual({
      ok: false,
      reason: 'date_invalid',
    });
  });

  it('negatif, sıfır ve aşırı miktarı reddeder', () => {
    for (const amountMl of [-1, 0, 5000]) {
      expect(validateNewLog({ localDate: today, minuteOfDay: 60, amountMl }, today, nowMinute).ok).toBe(false);
    }
  });
});

describe('sumAmounts', () => {
  it('toplar', () => {
    expect(sumAmounts([])).toBe(0);
    expect(sumAmounts([{ amountMl: 250 }, { amountMl: 500 }, { amountMl: 150 }])).toBe(900);
  });
});
