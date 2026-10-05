import { parseAge, parseWakeSleep, parseWeight, PROFILE_MESSAGES, stepGoal } from './profile';

describe('stepGoal', () => {
  it('±100 ml ve 500–4.000 sınırı', () => {
    expect(stepGoal(2000, 1)).toBe(2100);
    expect(stepGoal(2000, -1)).toBe(1900);
    expect(stepGoal(4000, 1)).toBe(4000);
    expect(stepGoal(500, -1)).toBe(500);
    expect(stepGoal(550, -1)).toBe(500);
  });
});

describe('parseAge / parseWeight', () => {
  it('boş bırakılabilir (zorunlu değil)', () => {
    expect(parseAge('')).toEqual({ ok: true, value: null });
    expect(parseWeight('  ')).toEqual({ ok: true, value: null });
  });
  it('geçerli değerler', () => {
    expect(parseAge('22')).toEqual({ ok: true, value: 22 });
    expect(parseWeight('70')).toEqual({ ok: true, value: 70 });
  });
  it.each(['0', '121', '-5', '2.5', 'abc'])('yaş %j reddedilir', (t) => expect(parseAge(t)).toEqual({ ok: false, message: PROFILE_MESSAGES.age }));
  it.each(['19', '301', '70.5', '-70'])('kilo %j reddedilir', (t) => expect(parseWeight(t)).toEqual({ ok: false, message: PROFILE_MESSAGES.weight }));
});

describe('parseWakeSleep', () => {
  it('aynı gün içinde ve gece yarısını aşan aralık kabul', () => {
    expect(parseWakeSleep('08:00', '23:00')).toEqual({ ok: true, value: { wakeMin: 480, sleepMin: 1380 } });
    expect(parseWakeSleep('08:00', '01:00')).toEqual({ ok: true, value: { wakeMin: 480, sleepMin: 60 } });
  });
  it('geçersiz biçim ve aynı saat reddedilir', () => {
    expect(parseWakeSleep('8:00', '23:00').ok).toBe(false);
    expect(parseWakeSleep('08:00', '25:00').ok).toBe(false);
    expect(parseWakeSleep('08:00', '08:00')).toEqual({ ok: false, message: PROFILE_MESSAGES.sameTimes });
  });
});
