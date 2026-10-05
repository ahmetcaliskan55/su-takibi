import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMl, toLocalDateKey } from '@/domain/date';
import { maskTimeInput } from '@/domain/logForm';
import {
  ACTIVITIES,
  DEFAULT_INTERVAL_MIN,
  GLASS_OPTIONS_ML,
  INTERVAL_OPTIONS_MIN,
  parseAge,
  parseWakeSleep,
  parseWeight,
  stepGoal,
  TONES,
  type Activity,
  type Tone,
} from '@/domain/profile';
import { DEFAULT_GOAL_ML, MAX_GOAL_ML, MIN_GOAL_ML } from '@/domain/water';
import type { SettingsRepository } from '@/db/settingsRepository';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { DisplayText } from './DisplayText';
import { Card, Chips, ErrorText, Field, GoalStepper, Label, Note, PrimaryButton } from './form';
import { Plant } from './Plant';

const STEPS = 4;
const SAVE_FAILED = 'Kaydedilemedi. Biraz sonra tekrar dene.';

/** İlk kurulum: tanışma → profil (isteğe bağlı) → hedef ve bardak → hatırlatma tercihleri ve bildirim izni (reddedilirse uygulama yine kullanılır). */
export function OnboardingFlow({ repo, onDone, onRequestPermission }: { repo: SettingsRepository; onDone: () => void; onRequestPermission: () => Promise<unknown> }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [ageText, setAgeText] = useState('');
  const [weightText, setWeightText] = useState('');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [goal, setGoal] = useState<number>(DEFAULT_GOAL_ML);
  const [glass, setGlass] = useState<number>(250);
  const [wakeText, setWakeText] = useState('08:00');
  const [sleepText, setSleepText] = useState('23:00');
  const [intervalMin, setIntervalMin] = useState<number>(DEFAULT_INTERVAL_MIN);
  const [tone, setTone] = useState<Tone>('komik');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const go = (n: number) => {
    setError(null);
    setStep(n);
  };

  const next = () => {
    if (step === 1) {
      const age = parseAge(ageText);
      if (!age.ok) return setError(age.message);
      const weight = parseWeight(weightText);
      if (!weight.ok) return setError(weight.message);
    }
    go(step + 1);
  };

  /** `allow`: hatırlatmalar açık kaydedilir ve işletim sisteminin bildirim izni istenir; değilse hatırlatmalar kapalı kaydedilir. */
  const finish = async (allow: boolean) => {
    const times = parseWakeSleep(wakeText, sleepText);
    if (!times.ok) return setError(times.message);
    const age = parseAge(ageText);
    const weight = parseWeight(weightText);
    if (!age.ok || !weight.ok) return go(1);
    setSaving(true);
    setError(null);
    try {
      await repo.completeOnboarding({
        goalMl: goal,
        glassMl: glass,
        profile: { age: age.value, weightKg: weight.value, activity },
        reminders: { remindersEnabled: allow, intervalMin, tone, ...times.value },
        todayKey: toLocalDateKey(new Date()),
      });
      if (allow) await onRequestPermission().catch(() => undefined); // izin reddedilse de kurulum biter
      onDone();
    } catch {
      setError(SAVE_FAILED); // başarı ilerlemesi yok: kurulum tamamlanmış sayılmaz
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.top}>
        <View style={styles.back}>
          {step > 0 ? (
            <Pressable onPress={() => go(step - 1)} accessibilityRole="button" accessibilityLabel="Önceki adım" style={styles.backBtn}>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d="M15 5l-7 7 7 7" fill="none" stroke={colors.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.dots} accessibilityLabel={`Adım ${step + 1} / ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <View key={i} style={[styles.dot, { width: i === step ? 24 : 8, backgroundColor: i <= step ? colors.green : '#D9C3AE' }]} />
          ))}
        </View>
        <Text style={styles.count}>{`${step + 1} / ${STEPS}`}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 0 ? (
          <>
            <View style={styles.hero}>
              <View style={styles.ground} />
              <Plant stage={0} width={200} />
            </View>
            <DisplayText accessibilityRole="header" style={styles.h1}>
              Her güne bir tohum
            </DisplayText>
            <Text style={styles.lead}>İçtiğin suyu kaydet, günün bitkisi tohumdan çiçeğe büyüsün. Ertesi gün yeni bir tohumla başlarsın.</Text>
            <Text style={styles.small}>Üyelik yok. Verilerin yalnızca bu telefonda kalır.</Text>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <DisplayText accessibilityRole="header" style={styles.h1}>
              Seni tanıyalım
            </DisplayText>
            <Text style={styles.lead}>Bu bilgiler isteğe bağlıdır ve yalnızca profilinde durur. İstersen boş bırakıp sonra doldurabilirsin.</Text>
            <Card>
              <View style={styles.row}>
                <Field label="Yaş" value={ageText} onChangeText={(t) => (setAgeText(t.replace(/\D/g, '').slice(0, 3)), setError(null))} keyboardType="number-pad" maxLength={3} />
                <Field label="Kilo (kg)" value={weightText} onChangeText={(t) => (setWeightText(t.replace(/\D/g, '').slice(0, 3)), setError(null))} keyboardType="number-pad" maxLength={3} />
              </View>
              <Label>Aktivite düzeyi</Label>
              <Chips label="Aktivite düzeyi" options={ACTIVITIES.map((a) => ({ value: a.id, label: a.label }))} selected={activity} onSelect={(v) => setActivity(v === activity ? null : v)} />
            </Card>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <DisplayText accessibilityRole="header" style={styles.h1}>
              Günlük hedefin
            </DisplayText>
            <Card>
              <GoalStepper goalMl={goal} min={MIN_GOAL_ML} max={MAX_GOAL_ML} format={formatMl} onChange={(d) => setGoal(stepGoal(goal, d))} />
              <Note>Bu, başlangıç için seçilmiş genel bir değerdir; sana özel bir öneri ya da tıbbi tavsiye değildir. İstediğin zaman değiştirebilirsin.</Note>
            </Card>
            <Card>
              <Label>Bardağın ya da şişen kaç ml?</Label>
              <Chips label="Bardak miktarı" options={GLASS_OPTIONS_ML.map((v) => ({ value: v, label: String(v) }))} selected={glass} onSelect={setGlass} />
              <Note>Su eklerken bu miktar hazır seçili gelir.</Note>
            </Card>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <DisplayText accessibilityRole="header" style={styles.h1}>
              Hatırlatma tercihlerin
            </DisplayText>
            <Card tone="green">
              <Note>Su molalarını hatırlatabilmek için birazdan telefonun bildirim izni soracak. Bildirimler bu telefonda oluşturulur; uyku saatlerinde ve günlük hedefin tamamlanınca gelmez.</Note>
            </Card>
            <Card>
              <View style={styles.row}>
                <Field label="Uyanma saati" value={wakeText} onChangeText={(t) => (setWakeText(maskTimeInput(t)), setError(null))} keyboardType="number-pad" maxLength={5} placeholder="08:00" />
                <Field label="Uyuma saati" value={sleepText} onChangeText={(t) => (setSleepText(maskTimeInput(t)), setError(null))} keyboardType="number-pad" maxLength={5} placeholder="23:00" />
              </View>
              <Note>Gece yarısını aşan aralıklar olur (ör. 08:00 – 01:00).</Note>
              <Label>Hatırlatma aralığı</Label>
              <Chips label="Hatırlatma aralığı" options={INTERVAL_OPTIONS_MIN.map((m) => ({ value: m, label: `${m / 60} saat` }))} selected={intervalMin} onSelect={setIntervalMin} />
              <Label>Mesaj tarzı</Label>
              <Chips label="Mesaj tarzı" options={TONES.map((t) => ({ value: t.id, label: t.label }))} selected={tone} onSelect={setTone} />
            </Card>
          </>
        ) : null}
      </ScrollView>

      {error ? <ErrorText>{error}</ErrorText> : null}
      <View style={styles.footer}>
        {step === STEPS - 1 ? (
          <>
            <PrimaryButton label="Bildirimlere izin ver" disabled={saving} onPress={() => void finish(true)} />
            <Pressable onPress={() => void finish(false)} disabled={saving} accessibilityRole="button" style={styles.skip}>
              <Text style={styles.skipText}>Şimdi değil</Text>
            </Pressable>
          </>
        ) : (
          <PrimaryButton label={step === 0 ? 'Başlayalım' : 'Devam'} disabled={saving} onPress={next} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 24, gap: 12 },
  top: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44 },
  backBtn: { width: 44, height: 44, marginLeft: -12, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  count: { width: 44, textAlign: 'right', fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.inkSoft },
  body: { gap: 14, paddingBottom: 8 },
  hero: { height: 280, borderRadius: 32, backgroundColor: colors.greenLight, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 46, backgroundColor: colors.ground },
  h1: { fontSize: 30, lineHeight: 35 },
  lead: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 23, color: colors.inkSoft },
  small: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: colors.ink },
  row: { flexDirection: 'row', gap: 10 },
  footer: { paddingTop: 4, gap: 4 },
  skip: { height: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.inkSoft },
});
