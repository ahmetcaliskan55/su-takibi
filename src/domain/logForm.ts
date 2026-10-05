import { MAX_AMOUNT_ML, MIN_AMOUNT_ML } from './water';

/** Saat alanı maskesi: yalnızca rakamlar, en çok 4 hane, 3. haneden önce ":" → `1630` → `16:30`. */
export function maskTimeInput(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}

/** Miktar alanı: yalnızca rakamlar, en çok 5 hane. */
export function maskAmountInput(text: string): string {
  return text.replace(/\D/g, '').slice(0, 5);
}

/** Günün dakikası → `16:30` (giriş alanı biçimi). */
export function formatTimeInput(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** `16:30` → 990. Geçersizse `null` (saat > 23 veya dakika > 59 dahil). */
export function parseTimeInput(text: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

export type FormField = 'amount' | 'time';

export type FormResult =
  | { ok: true; value: { amountMl: number; minuteOfDay: number } }
  | { ok: false; field: FormField; message: string };

const RANGE_MESSAGE = `${MIN_AMOUNT_ML} ile 2.000 ml arasında bir miktar gir.`;
export const FORM_MESSAGES = {
  amountEmpty: 'Önce bir miktar gir.',
  amountDigits: 'Miktarı yalnızca rakamlarla gir.',
  amountRange: RANGE_MESSAGE,
  timeFormat: 'Saati 16:30 biçiminde yaz.',
  timeFuture: 'Gelecekteki bir saat girilemez.',
} as const;

/**
 * Su ekleme/düzenleme formunun doğrulaması. İlk hatada durur; hata hangi alana aittir söyler.
 * `nowMinute`: şu anki günün dakikası. Bugün için ondan ileri saat reddedilir.
 */
export function validateLogForm(input: { amountText: string; timeText: string }, nowMinute: number): FormResult {
  const amountText = input.amountText.trim();
  if (amountText === '') return { ok: false, field: 'amount', message: FORM_MESSAGES.amountEmpty };
  if (!/^\d+$/.test(amountText)) return { ok: false, field: 'amount', message: FORM_MESSAGES.amountDigits };
  const amountMl = Number(amountText);
  if (!(amountMl >= MIN_AMOUNT_ML && amountMl <= MAX_AMOUNT_ML)) {
    return { ok: false, field: 'amount', message: FORM_MESSAGES.amountRange };
  }
  const minuteOfDay = parseTimeInput(input.timeText);
  if (minuteOfDay === null) return { ok: false, field: 'time', message: FORM_MESSAGES.timeFormat };
  if (minuteOfDay > nowMinute) return { ok: false, field: 'time', message: FORM_MESSAGES.timeFuture };
  return { ok: true, value: { amountMl, minuteOfDay } };
}
