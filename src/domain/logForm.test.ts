import { formatTimeInput, FORM_MESSAGES, maskAmountInput, maskTimeInput, parseTimeInput, validateLogForm } from './logForm';

const NOW = 16 * 60 + 30; // 16:30

describe('maskTimeInput / maskAmountInput', () => {
  it.each([
    ['1', '1'],
    ['163', '16:3'],
    ['1630', '16:30'],
    ['16:30', '16:30'],
    ['16305', '16:30'],
    ['ab1c6', '16'],
    ['', ''],
  ])('saat %j → %j', (input, out) => expect(maskTimeInput(input)).toBe(out));

  it('miktar yalnızca rakam, en çok 5 hane', () => {
    expect(maskAmountInput('-250')).toBe('250');
    expect(maskAmountInput('25.5')).toBe('255');
    expect(maskAmountInput('1234567')).toBe('12345');
  });
});

describe('parseTimeInput / formatTimeInput', () => {
  it('geçerli saatler', () => {
    expect(parseTimeInput('00:00')).toBe(0);
    expect(parseTimeInput('16:30')).toBe(990);
    expect(parseTimeInput('23:59')).toBe(1439);
    expect(formatTimeInput(990)).toBe('16:30');
    expect(formatTimeInput(5)).toBe('00:05');
  });
  it.each(['24:00', '12:60', '1:30', '16.30', '', '99:99', 'aa:bb'])('%j geçersiz', (t) => expect(parseTimeInput(t)).toBeNull());
});

describe('validateLogForm', () => {
  const ok = (amountText: string, timeText: string) => validateLogForm({ amountText, timeText }, NOW);

  it('geçerli girişi sayıya çevirir', () => {
    expect(ok('250', '16:00')).toEqual({ ok: true, value: { amountMl: 250, minuteOfDay: 960 } });
    expect(ok(' 0250 ', '16:30')).toEqual({ ok: true, value: { amountMl: 250, minuteOfDay: 990 } });
    expect(ok('10', '00:00').ok).toBe(true);
    expect(ok('2000', '08:00').ok).toBe(true);
  });

  it('boş miktar', () => expect(ok('', '16:00')).toEqual({ ok: false, field: 'amount', message: FORM_MESSAGES.amountEmpty }));
  it('yalnızca boşluk', () => expect(ok('   ', '16:00')).toMatchObject({ ok: false, field: 'amount' }));

  it.each(['-250', '250.5', '25,5', 'abc', '2 5'])('negatif/ondalık/harf %j reddedilir', (a) => {
    expect(ok(a, '16:00')).toEqual({ ok: false, field: 'amount', message: FORM_MESSAGES.amountDigits });
  });

  it.each(['0', '9', '2001', '3900', '99999'])('aralık dışı miktar %j', (a) => {
    expect(ok(a, '16:00')).toEqual({ ok: false, field: 'amount', message: FORM_MESSAGES.amountRange });
  });

  it.each(['', '25:00', '12:60', '1630'])('geçersiz saat %j', (t) => {
    expect(ok('250', t)).toEqual({ ok: false, field: 'time', message: FORM_MESSAGES.timeFormat });
  });

  it('gelecekteki saati reddeder; şu anki dakika kabul', () => {
    expect(ok('250', '16:31')).toEqual({ ok: false, field: 'time', message: FORM_MESSAGES.timeFuture });
    expect(ok('250', '23:59').ok).toBe(false);
    expect(ok('250', '16:30').ok).toBe(true);
  });

  it('önce miktar hatasını bildirir', () => {
    expect(ok('', '99:99')).toMatchObject({ field: 'amount' });
  });
});
