import { addDaysToKey, MONTHS_SHORT_TR, parseDateKey, weekdayIndexMon0 } from './date';
import { plantStage, progressPercent, type PlantStage } from './plant';

/** Gün durumu: hedef tamam / kısmi / kayıt yok (0 ml). Satırı olmayan gün "veri yok"tur (burada değil). */
export type DayStatus = 'done' | 'part' | 'zero';

export interface DayTotal {
  localDate: string;
  goalMl: number;
  totalMl: number;
}

export function dayStatus(totalMl: number, goalMl: number): DayStatus {
  if (!(totalMl > 0)) return 'zero';
  return totalMl >= goalMl ? 'done' : 'part';
}

/** Günün bitkisi: o günün DONDURULMUŞ hedefiyle hesaplanır; sonradan hedef değişse de geçmiş değişmez. */
export const dayPlant = (d: DayTotal): PlantStage => plantStage(d.totalMl, d.goalMl);
export const dayPercent = (d: DayTotal): number => progressPercent(d.totalMl, d.goalMl);

// ---------- Takvim ----------

export const CALENDAR_DAYS = 35; // 5 hafta, Pazartesi ile başlar

export interface CalendarCell {
  dateKey: string;
  /** "12" ya da ayın 1'inde "1 Eki" */
  label: string;
  isToday: boolean;
  isFuture: boolean;
}

export interface CalendarPage {
  cells: CalendarCell[];
  startKey: string;
  endKey: string;
  rangeLabel: string;
}

/**
 * Takvim sayfası. Sayfa 0: son haftası bugünü içeren 5 hafta; -1 bir önceki 35 gün, vb.
 * Pazartesi başlar; bugünden sonraki günler "gelecek" olarak işaretlenir.
 */
export function buildCalendarPage(todayKey: string, page: number): CalendarPage {
  const mondayThisWeek = addDaysToKey(todayKey, -weekdayIndexMon0(todayKey));
  const startKey = addDaysToKey(mondayThisWeek, -(CALENDAR_DAYS - 7) + page * CALENDAR_DAYS);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < CALENDAR_DAYS; i++) {
    const dateKey = addDaysToKey(startKey, i);
    const d = parseDateKey(dateKey);
    cells.push({
      dateKey,
      label: d.getDate() === 1 ? `1 ${MONTHS_SHORT_TR[d.getMonth()]}` : String(d.getDate()),
      isToday: dateKey === todayKey,
      isFuture: dateKey > todayKey,
    });
  }
  const endKey = addDaysToKey(startKey, CALENDAR_DAYS - 1);
  const a = parseDateKey(startKey);
  const b = parseDateKey(endKey);
  return {
    cells,
    startKey,
    endKey,
    rangeLabel: `${a.getDate()} ${MONTHS_SHORT_TR[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT_TR[b.getMonth()]}`,
  };
}

/** Bu sayfadan önce gösterilecek veri var mı? (İlk gün sayfanın başından önceyse evet.) */
export function hasEarlierPage(firstDayKey: string | null, pageStartKey: string): boolean {
  return firstDayKey !== null && firstDayKey < pageStartKey;
}

// ---------- İstatistik ----------

/** Bugün dahil son `n` gün, eskiden yeniye. */
export function lastNDays(todayKey: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDaysToKey(todayKey, -(n - 1 - i)));
}

export interface StatBar {
  dateKey: string;
  kind: DayStatus | 'none';
  totalMl: number;
  /** O günün kendi hedefi; veri yoksa `null`. */
  goalMl: number | null;
  isToday: boolean;
}

export interface Stats {
  bars: StatBar[];
  /** Verisi olan günlerin (0 ml dahil) ortalaması; hiç veri yoksa `null`. */
  averageMl: number | null;
  doneCount: number;
  counts: Record<DayStatus | 'none', number>;
  /** Grafiğin tavanı (ml). */
  chartMax: number;
}

export const CHART_MIN_MAX_ML = 2500;

export function computeStats(dateKeys: readonly string[], rows: readonly DayTotal[], todayKey: string): Stats {
  const byDate = new Map(rows.map((r) => [r.localDate, r]));
  const counts: Stats['counts'] = { done: 0, part: 0, zero: 0, none: 0 };
  let sum = 0;
  let withData = 0;
  let maxGoal = 0;

  const bars = dateKeys.map((dateKey): StatBar => {
    const row = byDate.get(dateKey);
    const isToday = dateKey === todayKey;
    if (!row) {
      counts.none += 1;
      return { dateKey, kind: 'none', totalMl: 0, goalMl: null, isToday };
    }
    const kind = dayStatus(row.totalMl, row.goalMl);
    counts[kind] += 1;
    sum += row.totalMl;
    withData += 1;
    maxGoal = Math.max(maxGoal, row.goalMl);
    return { dateKey, kind, totalMl: row.totalMl, goalMl: row.goalMl, isToday };
  });

  return {
    bars,
    averageMl: withData > 0 ? Math.round(sum / withData) : null,
    doneCount: counts.done,
    counts,
    chartMax: Math.max(CHART_MIN_MAX_ML, Math.round(maxGoal * 1.25)),
  };
}

/** Çubuk yüksekliği (px): kayıt varsa en az 6 px, tavanı aşan değer tavanda kalır. */
export function barHeight(totalMl: number, chartMax: number, plotHeight: number): number {
  if (totalMl <= 0) return 0;
  return Math.max(6, Math.round((Math.min(totalMl, chartMax) / chartMax) * plotHeight));
}
