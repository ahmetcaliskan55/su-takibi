import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Chips, ErrorText, Field, GoalStepper, Label, Note } from '@/components/form';
import { DisplayText } from '@/components/DisplayText';
import { formatMl, toLocalDateKey } from '@/domain/date';
import { ACTIVITIES, GLASS_OPTIONS_ML, parseAge, parseWeight, stepGoal, type Activity } from '@/domain/profile';
import { MAX_GOAL_ML, MIN_GOAL_ML } from '@/domain/water';
import { useSettingsRepository } from '@/state/DatabaseProvider';
import { useSettings } from '@/state/SettingsProvider';
import { colors } from '@/theme/colors';

const SAVE_FAILED = 'Kaydedilemedi. Biraz sonra tekrar dene.';

/** Hedef ve profil. Değişiklikler kendiliğinden kaydedilir; hedef değişimi yalnızca bugünü etkiler. */
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const repo = useSettingsRepository();
  const { settings, profile, reload } = useSettings();
  const [ageText, setAgeText] = useState(profile.age === null ? '' : String(profile.age));
  const [weightText, setWeightText] = useState(profile.weightKg === null ? '' : String(profile.weightKg));
  const [error, setError] = useState<string | null>(null);
  const [badField, setBadField] = useState<'age' | 'weight' | null>(null);

  const run = async (work: () => Promise<void>) => {
    try {
      await work();
      await reload();
      setError(null);
    } catch {
      setError(SAVE_FAILED);
    }
  };

  const changeGoal = (dir: 1 | -1) => {
    const next = stepGoal(settings.dailyGoalMl, dir);
    if (next !== settings.dailyGoalMl) void run(() => repo.setDailyGoal(next, toLocalDateKey(new Date())));
  };

  const saveProfile = (patch: { age?: number | null; weightKg?: number | null; activity?: Activity | null }) =>
    run(() => repo.saveProfile({ ...profile, ...patch }));

  const commitAge = () => {
    const parsed = parseAge(ageText);
    if (!parsed.ok) return (setError(parsed.message), setBadField('age'));
    setBadField(null);
    if (parsed.value !== profile.age) void saveProfile({ age: parsed.value });
    else setError(null);
  };
  const commitWeight = () => {
    const parsed = parseWeight(weightText);
    if (!parsed.ok) return (setError(parsed.message), setBadField('weight'));
    setBadField(null);
    if (parsed.value !== profile.weightKg) void saveProfile({ weightKg: parsed.value });
    else setError(null);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={styles.back}>
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path d="M15 5l-7 7 7 7" fill="none" stroke={colors.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <DisplayText accessibilityRole="header" style={styles.title}>
          Hedef ve profil
        </DisplayText>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 24 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <Card>
          <Label>Günlük hedef</Label>
          <GoalStepper goalMl={settings.dailyGoalMl} min={MIN_GOAL_ML} max={MAX_GOAL_ML} format={formatMl} onChange={changeGoal} />
          <Note>100 ml adımlarla, 500–4.000 ml arası. Değişiklik yalnızca bugünü etkiler; önceki günlerin hedefi korunur.</Note>
          <Note>Bu hedef sana özel bir öneri ya da tıbbi tavsiye değildir. Sana uymuyorsa değiştir; özel bir sağlık durumun varsa hekimine danış.</Note>
        </Card>

        <Card>
          <Label>Profil (isteğe bağlı)</Label>
          <View style={styles.row}>
            <Field label="Yaş" value={ageText} onChangeText={(t) => (setAgeText(t.replace(/\D/g, '').slice(0, 3)), setBadField(null))} onEndEditing={commitAge} keyboardType="number-pad" maxLength={3} bad={badField === 'age'} />
            <Field label="Kilo (kg)" value={weightText} onChangeText={(t) => (setWeightText(t.replace(/\D/g, '').slice(0, 3)), setBadField(null))} onEndEditing={commitWeight} keyboardType="number-pad" maxLength={3} bad={badField === 'weight'} />
          </View>
          <Label>Aktivite düzeyi</Label>
          <Chips label="Aktivite düzeyi" options={ACTIVITIES.map((a) => ({ value: a.id, label: a.label }))} selected={profile.activity} onSelect={(v) => void saveProfile({ activity: v === profile.activity ? null : v })} />
          <Note>Profil bilgilerin yalnızca bu telefonda saklanır.</Note>
        </Card>

        <Card>
          <Label>Bardak / şişe miktarı (ml)</Label>
          <Chips label="Bardak miktarı" options={GLASS_OPTIONS_ML.map((v) => ({ value: v, label: String(v) }))} selected={settings.glassMl} onSelect={(v) => void run(() => repo.setGlassAmount(v))} />
          <Note>Su ekle panelinde bu miktar hazır seçili gelir.</Note>
        </Card>

        {error ? <ErrorText>{error}</ErrorText> : null}
        <Note>Değişiklikler kendiliğinden kaydedilir.</Note>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, lineHeight: 28 },
  body: { padding: 20, gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
});
