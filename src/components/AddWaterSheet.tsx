import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { minuteOfDay } from '@/domain/date';
import { formatTimeInput, maskAmountInput, maskTimeInput, validateLogForm, type FormField } from '@/domain/logForm';
import { QUICK_AMOUNTS_ML } from '@/domain/water';
import type { WaterLog } from '@/db/waterRepository';
import type { ActionResult } from '@/state/useToday';
import type { LogInput } from '@/state/waterService';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { DisplayText } from './DisplayText';
import { Sheet } from './Sheet';

interface Props {
  /** Düzenlenen kayıt; yoksa yeni kayıt. */
  editing: WaterLog | null;
  now: Date;
  saving: boolean;
  onSubmit: (input: LogInput) => Promise<ActionResult>;
  onDelete?: () => void;
  onClose: () => void;
  overlay?: React.ReactNode;
}

/** Özel miktar ve saatle su ekleme / kayıt düzenleme paneli. */
export function AddWaterSheet({ editing, now, saving, onSubmit, onDelete, onClose, overlay }: Props) {
  const [amountText, setAmountText] = useState(editing ? String(editing.amountMl) : '250');
  const [timeText, setTimeText] = useState(formatTimeInput(editing ? editing.minuteOfDay : minuteOfDay(now)));
  const [error, setError] = useState<{ field: FormField | null; message: string } | null>(null);

  const submit = async () => {
    // Saat doğrulaması kaydet anındaki "şimdi"ye göre yapılır (panel açık kalmış olabilir).
    const checked = validateLogForm({ amountText, timeText }, minuteOfDay(new Date()));
    if (!checked.ok) {
      setError({ field: checked.field, message: checked.message });
      return;
    }
    setError(null);
    const res = await onSubmit(checked.value);
    if (!res.ok && res.message) setError({ field: null, message: res.message });
  };

  const amountBad = error?.field === 'amount';
  const timeBad = error?.field === 'time';

  return (
    <Sheet title={editing ? 'Kaydı düzenle' : 'Su ekle'} onClose={onClose} overlay={overlay}>
      <View style={styles.chips}>
        {QUICK_AMOUNTS_ML.map((v) => {
          const on = amountText === String(v);
          return (
            <Pressable
              key={v}
              onPress={() => {
                setAmountText(String(v));
                setError(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{v} ml</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.fields}>
        <View style={styles.field}>
          <Text style={styles.label}>Özel miktar (ml)</Text>
          <TextInput
            value={amountText}
            onChangeText={(t) => {
              setAmountText(maskAmountInput(t));
              setError(null);
            }}
            keyboardType="number-pad"
            maxLength={5}
            accessibilityLabel="Özel miktar, mililitre"
            style={[styles.input, amountBad && styles.inputBad]}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>İçme saati</Text>
          <TextInput
            value={timeText}
            onChangeText={(t) => {
              setTimeText(maskTimeInput(t));
              setError(null);
            }}
            keyboardType="number-pad"
            placeholder="16:00"
            maxLength={5}
            accessibilityLabel="İçme saati, saat ve dakika"
            style={[styles.input, timeBad && styles.inputBad]}
          />
        </View>
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error.message}
        </Text>
      ) : null}

      {editing && onDelete ? (
        <Pressable onPress={onDelete} disabled={saving} accessibilityRole="button" style={styles.delete}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path
              d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7M10 11v5M14 11v5"
              fill="none"
              stroke={colors.error}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.deleteText}>Bu kaydı sil</Text>
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={onClose} accessibilityRole="button" style={[styles.btn, styles.cancel]}>
          <Text style={styles.cancelText}>İptal</Text>
        </Pressable>
        <Pressable
          onPress={() => void submit()}
          disabled={saving}
          accessibilityRole="button"
          accessibilityState={{ busy: saving, disabled: saving }}
          style={[styles.btn, styles.save, saving && styles.saving]}
        >
          <DisplayText style={styles.saveText}>Kaydet</DisplayText>
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, height: 52, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  chipOn: { borderColor: colors.green, backgroundColor: colors.greenLight },
  chipText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  chipTextOn: { color: colors.greenDark },
  fields: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, gap: 6 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.inkSoft },
  input: { height: 52, paddingHorizontal: 14, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, fontFamily: fonts.bodyHeavy, fontSize: 18, color: colors.ink },
  inputBad: { borderColor: colors.error },
  error: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#FDE7E4', fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 19, color: '#8C1D18' },
  delete: { alignSelf: 'flex-start', height: 44, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteText: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.error },
  actions: { flexDirection: 'row', gap: 10, paddingBottom: 5 },
  btn: { height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cancel: { flex: 1, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white },
  cancelText: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },
  save: { flex: 1.6, backgroundColor: colors.green, borderBottomWidth: 5, borderBottomColor: colors.greenDark },
  saving: { opacity: 0.7 },
  saveText: { fontSize: 19, color: colors.white },
});
