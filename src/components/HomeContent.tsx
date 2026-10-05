import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { bubbleText, type BubbleEvent } from '@/domain/messages';
import { formatDayHeading, formatMinuteOfDay, formatMl } from '@/domain/date';
import { nextStage, plantStage, progressPercent, remainingMl } from '@/domain/plant';
import { QUICK_AMOUNTS_ML } from '@/domain/water';
import type { DaySummary } from '@/db/waterRepository';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { ChevronIcon, ClockIcon, PencilIcon, PlusIcon } from './icons';
import { DisplayText } from './DisplayText';
import { DropIcon } from './DropIcon';
import { Plant } from './Plant';
import { ScreenHeader } from './ScreenHeader';

interface Props {
  day: DaySummary;
  now: Date;
  saving: boolean;
  actionError: string | null;
  bubbleEvent: BubbleEvent;
  onQuickAdd: (amountMl: number) => void;
  onOpenAdd: () => void;
  onOpenRecords: () => void;
  onOpenProfile: () => void;
}

const QUICK_ICON_SIZES: Record<number, [number, number]> = { 150: [12, 15], 250: [15, 18], 500: [18, 22] };
const STAGE_DROPS = ['Filiz', 'Yaprak', 'Tomurcuk', 'Çiçek'] as const;

export function HomeContent({ day, now, saving, actionError, bubbleEvent, onQuickAdd, onOpenAdd, onOpenRecords, onOpenProfile }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth = width - 40;
  const plantWidth = Math.min(216, Math.round(cardWidth * 0.6));
  const sideWidth = Math.min(152, Math.round(cardWidth * 0.44));

  const { totalMl, goalMl } = day;
  const stage = plantStage(totalMl, goalMl);
  const done = totalMl >= goalMl;
  const next = nextStage(totalMl, goalMl);
  const last = day.logs[0];

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        eyebrow={formatDayHeading(now)}
        title="Bugünün saksısı"
        right={
          <View style={styles.pctPill} accessibilityLabel={`Günlük hedefin yüzde ${progressPercent(totalMl, goalMl)} kadarı`}>
            <Text style={styles.pctText}>%{progressPercent(totalMl, goalMl)}</Text>
          </View>
        }
      />

      <View style={styles.plantCard}>
        <View style={styles.ground} />
        <View style={[styles.plantSlot, { left: 4 }]}>
          <Plant stage={stage} width={plantWidth} />
        </View>

        <View style={[styles.bubble, { width: sideWidth }]}>
          <Text style={styles.bubbleLabel}>Saksın diyor ki</Text>
          <Text style={styles.bubbleText}>{bubbleText(bubbleEvent, stage, totalMl)}</Text>
        </View>

        <Pressable onPress={onOpenProfile} accessibilityRole="button" accessibilityLabel="Günlük hedefi düzenle" style={[styles.totals, { width: sideWidth }]}>
          <DisplayText variant="number" style={styles.totalNumber} accessibilityLabel={`${formatMl(totalMl)} mililitre içildi`}>
            {formatMl(totalMl)}
          </DisplayText>
          <View style={styles.goalRow}>
            <Text style={styles.goalText}>/ {formatMl(goalMl)} ml</Text>
            <PencilIcon color={colors.greenText} />
          </View>
          <View style={styles.remainPill}>
            <Text style={styles.remainText}>
              {done ? 'Hedef tamam' : `Kalan ${formatMl(remainingMl(totalMl, goalMl))} ml`}
            </Text>
          </View>
        </Pressable>
      </View>

      <View
        style={styles.stageCard}
        accessible
        accessibilityLabel={
          next ? `${next.name} aşamasına ${formatMl(next.mlLeft)} mililitre kaldı` : 'Bugünün çiçeği açtı'
        }
      >
        <View style={styles.drops}>
          {STAGE_DROPS.map((label, i) => {
            const on = stage >= i + 1;
            return (
              <View key={label} style={styles.dropCell}>
                <DropIcon width={30} height={36} filled={on} check={on} />
                <Text style={[styles.dropLabel, on && styles.dropLabelOn]}>{label}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.nextText}>
          {next ? `${dative(next.name)} ${formatMl(next.mlLeft)} ml kaldı` : 'Bugünün çiçeği açtı'}
        </Text>
      </View>

      <View style={styles.quickRow}>
        {QUICK_AMOUNTS_ML.map((ml) => {
          const [w, h] = QUICK_ICON_SIZES[ml] ?? [15, 18];
          return (
            <Pressable
              key={ml}
              onPress={() => onQuickAdd(ml)}
              accessibilityRole="button"
              accessibilityLabel={`${ml} mililitre hemen ekle`}
              accessibilityState={{ busy: saving }}
              style={({ pressed }) => [styles.quick, pressed && styles.quickPressed, saving && styles.quickSaving]}
            >
              <DropIcon width={w} height={h} filled />
              <Text style={styles.quickText}>{ml} ml</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onOpenAdd}
        accessibilityRole="button"
        style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
      >
        <PlusIcon color={colors.white} />
        <DisplayText style={styles.addText}>Su ekle</DisplayText>
      </Pressable>

      {actionError ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {actionError}
        </Text>
      ) : null}

      <Pressable onPress={onOpenRecords} accessibilityRole="button" accessibilityLabel="Bugünkü kayıtları göster" style={styles.lastRow}>
        <ClockIcon color={colors.inkSoft} />
        <Text style={styles.lastText}>
          {last ? `Son kayıt: ${formatMinuteOfDay(last.minuteOfDay)} · ${formatMl(last.amountMl)} ml` : 'Bugün henüz kayıt yok'}
        </Text>
        <ChevronIcon color={colors.inkSoft} />
      </Pressable>
    </ScrollView>
  );
}

/** Yönelme hâli: "Filiz" → "Filize", "Yapraklı" → "Yaprağa", "Tomurcuk" → "Tomurcuğa", "Çiçek" → "Çiçeğe" (prototipteki cümleler). */
function dative(name: string): string {
  switch (name) {
    case 'Filiz':
      return 'Filize';
    case 'Yapraklı':
      return 'Yaprağa';
    case 'Tomurcuk':
      return 'Tomurcuğa';
    case 'Çiçek':
      return 'Çiçeğe';
    default:
      return name;
  }
}

const styles = StyleSheet.create({
  content: { paddingBottom: 12 },
  pctPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.peach },
  pctText: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.peachInk },

  plantCard: {
    marginTop: 14,
    marginHorizontal: 20,
    height: 290,
    borderRadius: 32,
    backgroundColor: colors.greenLight,
    overflow: 'hidden',
  },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 46, backgroundColor: colors.ground },
  plantSlot: { position: 'absolute', bottom: 12 },
  bubble: {
    position: 'absolute',
    right: 14,
    top: 16,
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 6,
    backgroundColor: colors.white,
    gap: 3,
  },
  bubbleLabel: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.green },
  bubbleText: { fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 18, color: colors.ink },
  totals: { position: 'absolute', right: 14, bottom: 16, alignItems: 'flex-start', gap: 4 },
  totalNumber: { fontSize: 40, lineHeight: 44 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.greenText },
  remainPill: { marginTop: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, backgroundColor: colors.white },
  remainText: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.ink },

  stageCard: {
    marginTop: 12,
    marginHorizontal: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: colors.white,
    gap: 10,
  },
  drops: { flexDirection: 'row', gap: 8 },
  dropCell: { flex: 1, alignItems: 'center', gap: 4 },
  dropLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
  dropLabelOn: { fontFamily: fonts.bodyHeavy, color: colors.ink },
  nextText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft, textAlign: 'center' },

  quickRow: { marginTop: 12, marginHorizontal: 20, flexDirection: 'row', gap: 10 },
  quick: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickPressed: { backgroundColor: colors.greenLight, borderColor: colors.green },
  quickSaving: { opacity: 0.7 },
  quickText: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },

  errorText: {
    marginTop: 10,
    marginHorizontal: 20,
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.errorBg,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },

  addBtn: {
    marginTop: 12,
    marginHorizontal: 20,
    height: 60,
    borderRadius: 22,
    backgroundColor: colors.green,
    borderBottomWidth: 5,
    borderBottomColor: colors.greenDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnPressed: { opacity: 0.9 },
  addText: { fontSize: 20, color: colors.white },
  lastRow: { marginTop: 12, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  lastText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
});
