import { StyleSheet, Text, View } from 'react-native';
import { formatDayHeading, formatMinuteOfDay, formatMl, parseDateKey } from '@/domain/date';
import { dayPercent, dayPlant, dayStatus } from '@/domain/history';
import { STAGE_NAMES } from '@/domain/plant';
import type { DaySummary } from '@/db/waterRepository';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { DisplayText } from './DisplayText';
import { PrimaryButton } from './form';
import { Plant } from './Plant';
import { Sheet } from './Sheet';

interface Props {
  day: DaySummary;
  isToday: boolean;
  onClose: () => void;
  onEditToday: () => void;
}

/** Geçmiş günün salt okunur ayrıntısı: günün bitkisi, toplam, durum ve kayıt listesi. */
export function DaySheet({ day, isToday, onClose, onEditToday }: Props) {
  const total = { localDate: day.localDate, goalMl: day.goalMl, totalMl: day.totalMl };
  const stage = dayPlant(total);
  const status = dayStatus(day.totalMl, day.goalMl);
  const statusText = status === 'done' ? 'Hedef tamam' : status === 'zero' ? 'Kayıt yok · %0' : `Kısmi · %${dayPercent(total)}`;
  const rows = [...day.logs].sort((a, b) => a.minuteOfDay - b.minuteOfDay || a.id - b.id);

  return (
    <Sheet title={formatDayHeading(parseDateKey(day.localDate))} onClose={onClose}>
      <View style={styles.top}>
        <Plant stage={stage} width={96} />
        <View style={styles.info}>
          <Text style={styles.stage}>{STAGE_NAMES[stage]} aşaması</Text>
          <DisplayText variant="number" style={styles.total}>{`${formatMl(day.totalMl)} ml`}</DisplayText>
          <Text style={styles.goal}>/ {formatMl(day.goalMl)} ml hedef</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{statusText}</Text>
          </View>
        </View>
      </View>

      {day.totalMl > day.goalMl ? <Text style={styles.note}>Hedefin üzerindeki kayıtlar bitkiyi daha fazla büyütmez.</Text> : null}
      {rows.length === 0 ? <Text style={styles.note}>Bu gün için su kaydı yok. Bitki tohum olarak kaldı.</Text> : null}

      {rows.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.listTitle}>{rows.length} kayıt</Text>
          {rows.map((l) => (
            <View key={l.id} style={styles.row}>
              <DisplayText style={styles.time}>{formatMinuteOfDay(l.minuteOfDay)}</DisplayText>
              <Text style={styles.ml}>{formatMl(l.amountMl)} ml</Text>
            </View>
          ))}
        </View>
      ) : null}

      {isToday ? <PrimaryButton label="Bugünün kayıtlarını düzenle" onPress={onEditToday} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1, gap: 2 },
  stage: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.inkSoft },
  total: { fontSize: 32, lineHeight: 38 },
  goal: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.greenText },
  pill: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.peach },
  pillText: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.peachInk },
  note: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  list: { gap: 6, maxHeight: 260 },
  listTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  row: { height: 48, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 10 },
  time: { width: 62, fontSize: 18 },
  ml: { flex: 1, fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
});
