import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Chips, ErrorText, Field, Label, LinkRow, Note, Toggle } from '@/components/form';
import { GlassSheet, MessagesSheet } from '@/components/SettingsSheets';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatMl } from '@/domain/date';
import { formatTimeInput, maskTimeInput } from '@/domain/logForm';
import { MESSAGES } from '@/domain/messages';
import { INTERVAL_OPTIONS_MIN, parseWakeSleep, quietHoursText, TONES, type Tone } from '@/domain/profile';
import type { ReminderPrefs } from '@/db/settingsRepository';
import { useSettingsRepository } from '@/state/DatabaseProvider';
import { useSettings } from '@/state/SettingsProvider';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const SAVE_FAILED = 'Kaydedilemedi. Biraz sonra tekrar dene.';

/** Ayarlar: hedef/profil, bardak miktarı, hatırlatma tercihleri ve mesaj tarzı. Değişiklikler kendiliğinden kaydedilir. */
export default function SettingsScreen() {
  const router = useRouter();
  const repo = useSettingsRepository();
  const { settings, reload } = useSettings();
  const [wakeText, setWakeText] = useState(formatTimeInput(settings.wakeMin));
  const [sleepText, setSleepText] = useState(formatTimeInput(settings.sleepMin));
  const [error, setError] = useState<string | null>(null);
  const [badTimes, setBadTimes] = useState(false);
  const [sheet, setSheet] = useState<'glass' | 'messages' | null>(null);

  const prefs: ReminderPrefs = {
    remindersEnabled: settings.remindersEnabled,
    intervalMin: settings.intervalMin,
    wakeMin: settings.wakeMin,
    sleepMin: settings.sleepMin,
    tone: settings.tone,
  };

  const savePrefs = async (patch: Partial<ReminderPrefs>) => {
    try {
      await repo.saveReminderPrefs({ ...prefs, ...patch });
      await reload();
      setError(null);
    } catch {
      setError(SAVE_FAILED);
    }
  };

  const commitTimes = () => {
    const parsed = parseWakeSleep(wakeText, sleepText);
    if (!parsed.ok) {
      setError(parsed.message);
      setBadTimes(true);
      return;
    }
    setBadTimes(false);
    if (parsed.value.wakeMin !== settings.wakeMin || parsed.value.sleepMin !== settings.sleepMin) void savePrefs(parsed.value);
    else setError(null);
  };

  // Sessiz saat notu, yazılan geçerli değerlerle anında güncellenir; geçersizken kayıtlı değerleri gösterir.
  const typed = parseWakeSleep(wakeText, sleepText);
  const quietNote = typed.ok ? quietHoursText(typed.value.wakeMin, typed.value.sleepMin) : quietHoursText(settings.wakeMin, settings.sleepMin);

  const saveGlass = async (ml: number): Promise<string | null> => {
    try {
      await repo.setGlassAmount(ml);
      await reload();
      return null;
    } catch {
      return SAVE_FAILED;
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader eyebrow="Uygulama tercihlerin" title="Ayarlar" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LinkRow label="Hedef ve profil" value={`${formatMl(settings.dailyGoalMl)} ml`} onPress={() => router.push('/profile')} />
        <LinkRow label="Bardak / şişe miktarı" value={`${formatMl(settings.glassMl)} ml`} onPress={() => setSheet('glass')} />

        <Card>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>Hatırlatmalar</Text>
            <Toggle label="Hatırlatmalar" on={settings.remindersEnabled} onChange={(on) => void savePrefs({ remindersEnabled: on })} />
          </View>
          <Note>Hatırlatma bildirimleri sonraki sürümde devreye girecek. Tercihlerin şimdiden kaydedilir.</Note>

          {settings.remindersEnabled ? (
            <>
              <Label>Hatırlatma aralığı</Label>
              <Chips label="Hatırlatma aralığı" options={INTERVAL_OPTIONS_MIN.map((m) => ({ value: m, label: `${m / 60} saat` }))} selected={settings.intervalMin} onSelect={(m) => void savePrefs({ intervalMin: m })} />

              <View style={styles.row}>
                <Field label="Uyanma saati" value={wakeText} onChangeText={(t) => (setWakeText(maskTimeInput(t)), setBadTimes(false))} onEndEditing={commitTimes} keyboardType="number-pad" maxLength={5} placeholder="08:00" bad={badTimes} />
                <Field label="Uyuma saati" value={sleepText} onChangeText={(t) => (setSleepText(maskTimeInput(t)), setBadTimes(false))} onEndEditing={commitTimes} keyboardType="number-pad" maxLength={5} placeholder="23:00" bad={badTimes} />
              </View>
              <Note>{`${quietNote} Uyuma saatin gece yarısından sonra olabilir.`}</Note>

              <Label>Mesaj tarzı</Label>
              <Chips label="Mesaj tarzı" options={TONES.map((t) => ({ value: t.id, label: t.label }))} selected={settings.tone} onSelect={(t: Tone) => void savePrefs({ tone: t })} />
              <Note>{MESSAGES[settings.tone].description}</Note>
              <LinkRow label="Mesaj örneklerini gör" onPress={() => setSheet('messages')} />
            </>
          ) : (
            <Note>Hatırlatmalar kapalı. Su kayıtların ve bitkin bundan etkilenmez.</Note>
          )}
        </Card>

        {error ? <ErrorText>{error}</ErrorText> : null}

        <Card>
          <Text style={styles.cardTitle}>Gizlilik</Text>
          <Note>Verilerin yalnızca bu telefonda tutulur. Hesap açmana gerek yok, uygulama internetsiz çalışır.</Note>
        </Card>
        <Note>Değişiklikler kendiliğinden kaydedilir. Tüm verileri silme sonraki sürümde gelecek.</Note>
      </ScrollView>

      {sheet === 'glass' ? <GlassSheet glassMl={settings.glassMl} onSave={saveGlass} onClose={() => setSheet(null)} /> : null}
      {sheet === 'messages' ? <MessagesSheet tone={settings.tone} intervalMin={settings.intervalMin} label={MESSAGES[settings.tone].label} onClose={() => setSheet(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 20, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  row: { flexDirection: 'row', gap: 10 },
});
