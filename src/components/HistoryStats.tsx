import { StyleSheet, Text, View } from 'react-native';
import { formatMl, parseDateKey, WEEKDAYS_SHORT_TR } from '@/domain/date';
import { barHeight, type Stats } from '@/domain/history';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { Chips } from './form';
import { DisplayText } from './DisplayText';

const PLOT_H = 132;

interface Props {
  range: 7 | 30;
  onRange: (n: 7 | 30) => void;
  stats: Stats;
  caption: string;
}

/** Son 7 / 30 gün: ortalama, hedef tamam sayısı, günlük çubuklar ve her günün kendi hedef çizgisi. */
export function HistoryStats({ range, onRange, stats, caption }: Props) {
  const week = range === 7;
  const { counts } = stats;
  const summary = `Son ${range} günün günlük su tüketimi. Hedef tamamlanan ${counts.done}, kısmi ${counts.part}, sıfır ${counts.zero}, veri olmayan ${counts.none} gün.`;
  return (
    <View style={styles.wrap}>
      <Chips
        label="Aralık"
        options={[
          { value: 7, label: 'Son 7 gün' },
          { value: 30, label: 'Son 30 gün' },
        ]}
        selected={range}
        onSelect={(v) => onRange(v === 30 ? 30 : 7)}
      />

      <View style={styles.cards}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Günlük ortalama</Text>
          <DisplayText variant="number" style={styles.cardValue}>
            {stats.averageMl === null ? 'Veri yok' : `${formatMl(stats.averageMl)} ml`}
          </DisplayText>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Hedef tamam</Text>
          <DisplayText variant="number" style={styles.cardValue}>{`${stats.doneCount} / ${range} gün`}</DisplayText>
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHead}>
          <Text style={styles.chartTitle}>Günlük tüketim (ml)</Text>
          <Text style={styles.caption}>{caption}</Text>
        </View>
        <Text style={styles.goalNote}>┄ Çizgi: o günün kendi hedefi</Text>

        <View accessible accessibilityLabel={summary} style={[styles.plot, { gap: week ? 10 : 3 }]}>
          {stats.bars.map((b) => {
            const h = barHeight(b.totalMl, stats.chartMax, PLOT_H);
            const goalY = b.goalMl === null ? null : barHeight(b.goalMl, stats.chartMax, PLOT_H);
            const d = parseDateKey(b.dateKey);
            const xLabel = week ? (b.isToday ? 'Bugün' : WEEKDAYS_SHORT_TR[d.getDay()]) : d.getDay() === 1 || b.isToday ? String(d.getDate()) : '';
            return (
              <View key={b.dateKey} style={styles.col}>
                <Text style={styles.value}>{week ? (b.kind === 'none' ? '–' : formatMl(b.totalMl)) : ''}</Text>
                <View style={[styles.barArea, { height: PLOT_H }]}>
                  {b.kind === 'none' ? (
                    <View style={[styles.noneBar, { height: PLOT_H, borderRadius: week ? 8 : 3 }]} />
                  ) : b.kind === 'zero' ? (
                    <View style={styles.zeroBar} />
                  ) : (
                    <View style={[styles.bar, { height: h, backgroundColor: b.kind === 'done' ? colors.green : '#7FC0EA', borderTopLeftRadius: week ? 8 : 3, borderTopRightRadius: week ? 8 : 3 }]} />
                  )}
                  {goalY !== null ? <View style={[styles.goalLine, { bottom: goalY }]} /> : null}
                </View>
                <Text style={[styles.x, b.isToday && { fontFamily: fonts.bodyHeavy, color: colors.ink }]}>{xLabel}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.legend}>
          <Text style={styles.legendText}>Hedef tamam · {counts.done} gün</Text>
          <Text style={styles.legendText}>Kısmi · {counts.part} gün</Text>
          <Text style={styles.legendText}>0 ml · {counts.zero} gün</Text>
          <Text style={styles.legendText}>Veri yok · {counts.none} gün</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  cards: { flexDirection: 'row', gap: 10 },
  card: { flex: 1, padding: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.white, gap: 2 },
  cardLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft },
  cardValue: { fontSize: 22, lineHeight: 28 },
  chartCard: { padding: 14, borderRadius: 24, backgroundColor: colors.white, gap: 8 },
  chartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  chartTitle: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.ink },
  caption: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
  goalNote: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
  plot: { flexDirection: 'row', alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center', gap: 2 },
  value: { fontFamily: fonts.bodyHeavy, fontSize: 10, color: colors.inkSoft, height: 12 },
  barArea: { width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%' },
  noneBar: { width: '100%', backgroundColor: '#F6ECDF', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B79C82' },
  zeroBar: { width: '100%', height: 6, borderRadius: 3, borderWidth: 2, borderColor: '#A9825F' },
  goalLine: { position: 'absolute', left: -1, right: -1, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.ink, opacity: 0.55 },
  x: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.inkSoft, height: 14 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 },
  legendText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
});
