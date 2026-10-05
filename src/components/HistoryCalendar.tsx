import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dayPercent, dayPlant, dayStatus, type CalendarPage, type DayTotal } from '@/domain/history';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { Plant } from './Plant';

interface Props {
  page: CalendarPage;
  rows: ReadonlyMap<string, DayTotal>;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (dateKey: string) => void;
}

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const BG = { done: colors.greenLight, part: colors.white, zero: '#F6D2AE' } as const;
const STATUS_TEXT = { done: 'hedef tamam', part: 'kısmi', zero: 'kayıt yok' } as const;
const STAGE_NAMES = ['tohum', 'filiz', 'yapraklı', 'tomurcuk', 'çiçek'] as const;

/** 5 haftalık takvim: her gün için bitki ve yüzde; satırı olmayan gün "veri yok". */
export function HistoryCalendar({ page, rows, canPrev, canNext, onPrev, onNext, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.nav}>
        <Pressable onPress={onPrev} disabled={!canPrev} accessibilityRole="button" accessibilityLabel="Önceki haftalar" style={styles.navBtn}>
          <Text style={[styles.arrow, !canPrev && styles.off]}>‹</Text>
        </Pressable>
        <Text style={styles.range}>{page.rangeLabel}</Text>
        <Pressable onPress={onNext} disabled={!canNext} accessibilityRole="button" accessibilityLabel="Sonraki haftalar" style={styles.navBtn}>
          <Text style={[styles.arrow, !canNext && styles.off]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {page.cells.map((c) => {
          const row = rows.get(c.dateKey);
          const cell = styles.cell;
          if (c.isFuture) {
            return (
              <View key={c.dateKey} style={styles.slot}>
                <View style={[cell, styles.future]}>
                  <Text style={styles.dayFuture}>{c.label}</Text>
                </View>
              </View>
            );
          }
          if (!row) {
            return (
              <View key={c.dateKey} style={styles.slot}>
                <View style={[cell, styles.none]} accessibilityLabel={`${c.label}, veri yok`}>
                  <Text style={styles.dayNone}>{c.label}</Text>
                  <Text style={styles.dash}>–</Text>
                </View>
              </View>
            );
          }
          const status = dayStatus(row.totalMl, row.goalMl);
          return (
            <View key={c.dateKey} style={styles.slot}>
              <Pressable
                onPress={() => onSelect(c.dateKey)}
                accessibilityRole="button"
                accessibilityLabel={`${c.label}${c.isToday ? ' (bugün)' : ''}, ${STAGE_NAMES[dayPlant(row)]}, yüzde ${dayPercent(row)}, ${STATUS_TEXT[status]}`}
                style={[cell, { backgroundColor: BG[status] }, c.isToday && styles.today]}
              >
                <Text style={styles.day}>{c.label}</Text>
                <View style={styles.plant}>
                  <Plant stage={dayPlant(row)} width={24} compact />
                </View>
                <Text style={styles.pct}>%{dayPercent(row)}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <LegendItem bg={colors.greenLight} border={colors.green} label="Hedef tamam" />
        <LegendItem bg={colors.white} border="#E2CDB4" label="Kısmi" />
        <LegendItem bg="#F6D2AE" label="Kayıt yok (0 ml)" />
        <LegendItem bg="transparent" border="#B79C82" dashed label="Veri yok" />
      </View>
    </View>
  );
}

function LegendItem({ bg, border, dashed, label }: { bg: string; border?: string; dashed?: boolean; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: bg }, border ? { borderWidth: 1.5, borderColor: border, borderStyle: dashed ? 'dashed' : 'solid' } : null]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontFamily: fonts.bodyHeavy, fontSize: 30, lineHeight: 34, color: colors.ink },
  off: { color: '#C9B8A8' },
  range: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  slot: { width: `${100 / 7}%`, padding: 2 },
  cell: { height: 84, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', paddingTop: 3 },
  today: { borderColor: colors.green },
  day: { fontFamily: fonts.bodyHeavy, fontSize: 12, lineHeight: 14, color: colors.inkSoft },
  plant: { height: 48, overflow: 'hidden', marginTop: 2 },
  pct: { fontFamily: fonts.bodyHeavy, fontSize: 11, lineHeight: 13, color: colors.ink },
  none: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#D9C3AE' },
  dayNone: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 14, color: colors.inkSoft },
  dash: { marginTop: 18, fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.inkSoft },
  future: { borderColor: 'transparent' },
  dayFuture: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 14, color: colors.inkSoft },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
});
