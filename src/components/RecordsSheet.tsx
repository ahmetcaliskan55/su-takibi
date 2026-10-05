import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { formatMinuteOfDay, formatMl } from '@/domain/date';
import type { DaySummary, WaterLog } from '@/db/waterRepository';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { DisplayText } from './DisplayText';
import { Plant } from './Plant';
import { Sheet } from './Sheet';

interface Props {
  day: DaySummary;
  saving: boolean;
  onEdit: (log: WaterLog) => void;
  onDelete: (log: WaterLog) => void;
  onAdd: () => void;
  onClose: () => void;
  overlay?: React.ReactNode;
}

/** Bugünkü kayıtlar: saat ve miktar, her satırda düzenle/sil. */
export function RecordsSheet({ day, saving, onEdit, onDelete, onAdd, onClose, overlay }: Props) {
  return (
    <Sheet title="Bugünkü kayıtlar" onClose={onClose} overlay={overlay}>
      {day.logs.length > 0 ? (
        <>
          <Text style={styles.summary}>
            Toplam {formatMl(day.totalMl)} ml · {day.logs.length} kayıt
          </Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {day.logs.map((log) => {
              const time = formatMinuteOfDay(log.minuteOfDay);
              return (
                <View key={log.id} style={styles.row}>
                  <DisplayText style={styles.time}>{time}</DisplayText>
                  <Text style={styles.ml}>{formatMl(log.amountMl)} ml</Text>
                  <Pressable onPress={() => onEdit(log)} disabled={saving} accessibilityRole="button" accessibilityLabel={`${time} kaydını düzenle`} style={styles.iconBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                      <Path d="M4 20h4L19 9l-4-4L4 16v4z M13.5 6.5l4 4" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </Pressable>
                  <Pressable onPress={() => onDelete(log)} disabled={saving} accessibilityRole="button" accessibilityLabel={`${time} kaydını sil`} style={styles.iconBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                      <Path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7M10 11v5M14 11v5" fill="none" stroke={colors.error} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyPlant}>
            <Plant stage={0} width={140} />
          </View>
          <DisplayText style={styles.emptyTitle}>Bugün henüz kayıt yok</DisplayText>
          <Text style={styles.emptyBody}>İlk bardağını ekleyince tohum uyanır ve burada saatiyle görünür.</Text>
        </View>
      )}
      <Pressable onPress={onAdd} accessibilityRole="button" style={styles.add}>
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path d="M12 5v14M5 12h14" fill="none" stroke={colors.white} strokeWidth={2.6} strokeLinecap="round" />
        </Svg>
        <DisplayText style={styles.addText}>Su ekle</DisplayText>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  summary: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  list: { flexGrow: 0 },
  listContent: { gap: 8 },
  row: { height: 60, paddingLeft: 16, paddingRight: 6, borderRadius: 18, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 10 },
  time: { width: 62, fontSize: 20 },
  ml: { flex: 1, fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingTop: 8, paddingHorizontal: 12, paddingBottom: 4, alignItems: 'center', gap: 6 },
  emptyPlant: { height: 84, overflow: 'hidden', justifyContent: 'flex-end' },
  emptyTitle: { fontSize: 20 },
  emptyBody: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: colors.inkSoft, textAlign: 'center' },
  add: { height: 52, marginBottom: 5, borderRadius: 20, backgroundColor: colors.green, borderBottomWidth: 5, borderBottomColor: colors.greenDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addText: { fontSize: 18, color: colors.white },
});
