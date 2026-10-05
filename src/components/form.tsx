import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { DisplayText } from './DisplayText';
import { ChevronIcon } from './icons';

export function Card({ children, tone = 'white' }: { children: ReactNode; tone?: 'white' | 'green' | 'peach' }) {
  const bg = tone === 'green' ? colors.greenLight : tone === 'peach' ? colors.peach : undefined;
  return <View style={[styles.card, bg ? { backgroundColor: bg } : null]}>{children}</View>;
}

export function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Note({ children }: { children: string }) {
  return <Text style={styles.note}>{children}</Text>;
}

export function ErrorText({ children }: { children: string }) {
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {children}
    </Text>
  );
}

export function Field({ label, bad, ...input }: { label: string; bad?: boolean } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <TextInput accessibilityLabel={label} placeholderTextColor="#B79C82" {...input} style={[styles.input, bad && { borderColor: colors.error }]} />
    </View>
  );
}

interface ChipsProps<T extends string | number> {
  options: readonly { value: T; label: string }[];
  selected: T | null;
  onSelect: (value: T) => void;
  label: string;
}

/** Tek seçimli çip sırası (aktivite, bardak, aralık, mesaj tarzı). */
export function Chips<T extends string | number>({ options, selected, onSelect, label }: ChipsProps<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.chips}>
      {options.map((o) => {
        const on = o.value === selected;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onSelect(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && { color: colors.greenDark }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StepBtn({ children, onPress, label, disabled }: { children: string; onPress: () => void; label: string; disabled: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={[styles.stepBtn, disabled && { opacity: 0.4 }]}>
      <Text style={styles.stepText}>{children}</Text>
    </Pressable>
  );
}

/** Günlük hedef: − [değer] +, 100 ml adım. */
export function GoalStepper({ goalMl, onChange, min, max, format }: { goalMl: number; onChange: (dir: 1 | -1) => void; min: number; max: number; format: (n: number) => string }) {
  return (
    <View style={styles.stepper}>
      <StepBtn label="Hedefi 100 ml azalt" onPress={() => onChange(-1)} disabled={goalMl <= min}>
        −
      </StepBtn>
      <DisplayText variant="number" style={styles.goal} accessibilityLabel={`Günlük hedef ${format(goalMl)} mililitre`}>
        {`${format(goalMl)} ml`}
      </DisplayText>
      <StepBtn label="Hedefi 100 ml artır" onPress={() => onChange(1)} disabled={goalMl >= max}>
        +
      </StepBtn>
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} style={[styles.primary, disabled && { opacity: 0.6 }]}>
      <DisplayText style={styles.primaryText}>{label}</DisplayText>
    </Pressable>
  );
}

/** Açık/kapalı anahtarı (prototipteki yeşil hap). */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <Pressable
      onPress={() => onChange(!on)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      style={[styles.toggle, { backgroundColor: on ? colors.green : '#B9A696', alignItems: on ? 'flex-end' : 'flex-start' }]}
    >
      <View style={styles.knob} />
    </Pressable>
  );
}

export function LinkRow({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.linkRow}>
      <Text style={styles.linkLabel}>{label}</Text>
      <View style={styles.linkRight}>
        {value ? <Text style={styles.linkValue}>{value}</Text> : null}
        <ChevronIcon color={colors.inkSoft} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 24, backgroundColor: colors.white, gap: 12 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.inkSoft },
  note: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  error: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.errorBg, fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 19, color: '#8C1D18' },
  field: { flex: 1, gap: 6 },
  input: { height: 52, paddingHorizontal: 14, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, fontFamily: fonts.bodyHeavy, fontSize: 18, color: colors.ink },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, height: 48, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  chipOn: { borderColor: colors.green, backgroundColor: colors.greenLight },
  chipText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stepBtn: { width: 52, height: 52, borderRadius: 18, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: fonts.bodyHeavy, fontSize: 26, lineHeight: 30, color: colors.ink },
  goal: { fontSize: 34, lineHeight: 40 },
  primary: { height: 60, borderRadius: 22, backgroundColor: colors.green, borderBottomWidth: 5, borderBottomColor: colors.greenDark, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 20, color: colors.white },
  toggle: { width: 56, height: 32, borderRadius: 16, padding: 3, justifyContent: 'center' },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white },
  linkRow: { height: 60, paddingHorizontal: 16, borderRadius: 24, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  linkLabel: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  linkRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.inkSoft },
});
