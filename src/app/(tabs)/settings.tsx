import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Chips, ErrorText, Field, Label, LinkRow, Note, PrimaryButton, Toggle } from '@/components/form';
import { GlassSheet, MessagesSheet } from '@/components/SettingsSheets';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatMinuteOfDay, formatMl, MONTHS_SHORT_TR, toLocalDateKey } from '@/domain/date';
import { formatTimeInput, maskTimeInput } from '@/domain/logForm';
import { MESSAGES } from '@/domain/messages';
import { awakeSpanMin, noReminderFits } from '@/domain/reminders';
import { INTERVAL_OPTIONS_MIN, parseWakeSleep, reminderWindowText, TONES, type Tone } from '@/domain/profile';
import type { ReminderPrefs } from '@/db/settingsRepository';
import { useNotifications } from '@/notifications/NotificationProvider';
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
  const { driver, permission, requestPermission, openSystemSettings } = useNotifications();
  const [wakeText, setWakeText] = useState(formatTimeInput(settings.wakeMin));
  const [sleepText, setSleepText] = useState(formatTimeInput(settings.sleepMin));
  const [error, setError] = useState<string | null>(null);
  const [badTimes, setBadTimes] = useState(false);
  const [sheet, setSheet] = useState<'glass' | 'messages' | null>(null);
  const [schedule, setSchedule] = useState<{ count: number; next: Date | null } | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  // Tanılama: işletim sisteminde GERÇEKTEN kaç hatırlatma planlı (eşitleme bitsin diye kısa bir gecikmeyle).
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      driver.listScheduled().then(
        (info) => {
          if (!cancelled) setSchedule(info);
        },
        () => undefined,
      );
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [driver, settings, permission?.state]);

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

  /** Hatırlatmayı açarken, izin henüz sorulmadıysa işletim sisteminin bildirim izni istenir. */
  const toggleReminders = async (on: boolean) => {
    await savePrefs({ remindersEnabled: on });
    if (on && permission?.state === 'undetermined') await requestPermission();
  };

  /**
   * Saat alanları yazılırken kaydedilir: iki alan da tam (SS:DD) ve geçerliyse hemen kaydolur, eski hata silinir.
   * Sayı tuş takımında "Bitti" tuşu olmadığı ve dışarı dokunmak alanı bırakmadığı için "alandan çıkınca kaydet" güvenilmezdir.
   */
  const changeTime = (which: 'wake' | 'sleep', raw: string) => {
    const text = maskTimeInput(raw);
    const w = which === 'wake' ? text : wakeText;
    const sl = which === 'sleep' ? text : sleepText;
    if (which === 'wake') setWakeText(text);
    else setSleepText(text);

    const parsed = parseWakeSleep(w, sl);
    if (parsed.ok) {
      setError(null);
      setBadTimes(false);
      if (parsed.value.wakeMin !== settings.wakeMin || parsed.value.sleepMin !== settings.sleepMin) void savePrefs(parsed.value);
    } else if (w.length === 5 && sl.length === 5) {
      setError(parsed.message); // iki alan da dolu ama geçersiz: kaydedilmez
      setBadTimes(true);
    } else {
      setError(null); // yazım sürüyor
      setBadTimes(false);
    }
  };

  /** Alandan çıkarken yarım/geçersiz kalan metin, kayıtlı değerlere döner (ekran ile kayıt hep aynı olsun). */
  const revertTimes = () => {
    if (parseWakeSleep(wakeText, sleepText).ok) return;
    setWakeText(formatTimeInput(settings.wakeMin));
    setSleepText(formatTimeInput(settings.sleepMin));
    setError(null);
    setBadTimes(false);
  };

  // Not, yazılan geçerli değerlerle anında güncellenir; geçersizken kayıtlı değerleri gösterir.
  const typed = parseWakeSleep(wakeText, sleepText);
  const windowNote = typed.ok ? reminderWindowText(typed.value.wakeMin, typed.value.sleepMin) : reminderWindowText(settings.wakeMin, settings.sleepMin);

  const sendTest = async () => {
    setTestMsg(null);
    let info = permission;
    if (!info || info.state !== 'granted') {
      if (info?.state === 'undetermined' || info?.canAskAgain) info = await requestPermission();
      if (!info || info.state !== 'granted') {
        setTestMsg('Bildirim izni kapalı: test bildirimi gösterilemez. Önce izni aç.');
        return;
      }
    }
    try {
      await driver.sendTest(5);
      setTestMsg('Test bildirimi 5 saniye içinde gelecek. Gelmezse telefonun bildirim ayarlarında Yudumla bildirimleri kapalı olabilir.');
    } catch {
      setTestMsg('Test bildirimi planlanamadı.');
    }
  };

  const wakeNow = typed.ok ? typed.value.wakeMin : settings.wakeMin;
  const sleepNow = typed.ok ? typed.value.sleepMin : settings.sleepMin;
  const nothingFits = noReminderFits(wakeNow, sleepNow, settings.intervalMin);
  const nextLabel = (d: Date) => {
    const hhmm = formatMinuteOfDay(d.getHours() * 60 + d.getMinutes());
    return toLocalDateKey(d) === toLocalDateKey(new Date()) ? hhmm : `${d.getDate()} ${MONTHS_SHORT_TR[d.getMonth()]} ${hhmm}`;
  };

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
            <Toggle label="Hatırlatmalar" on={settings.remindersEnabled} onChange={(on) => void toggleReminders(on)} />
          </View>
          {settings.remindersEnabled && permission && permission.state !== 'granted' ? (
            <Card tone="peach">
              <Text style={styles.warnTitle}>Bildirim izni kapalı</Text>
              <Note>Hatırlatmalar açık ama telefon bildirim göstermeye izin vermiyor. İzni telefonun ayarlarından açabilirsin; su kaydı tutmaya devam edebilirsin.</Note>
              {permission.state === 'undetermined' || permission.canAskAgain ? (
                <PrimaryButton label="Bildirimlere izin ver" onPress={() => void requestPermission()} />
              ) : (
                <PrimaryButton label="Telefon ayarlarını aç" onPress={() => void openSystemSettings()} />
              )}
            </Card>
          ) : null}

          {settings.remindersEnabled ? (
            <>
              <Label>Hatırlatma aralığı</Label>
              <Chips label="Hatırlatma aralığı" options={INTERVAL_OPTIONS_MIN.map((m) => ({ value: m, label: `${m / 60} saat` }))} selected={settings.intervalMin} onSelect={(m) => void savePrefs({ intervalMin: m })} />

              <View style={styles.row}>
                <Field label="Uyanma saati" value={wakeText} onChangeText={(t) => changeTime('wake', t)} onEndEditing={revertTimes} keyboardType="number-pad" maxLength={5} placeholder="08:00" bad={badTimes} />
                <Field label="Uyuma saati" value={sleepText} onChangeText={(t) => changeTime('sleep', t)} onEndEditing={revertTimes} keyboardType="number-pad" maxLength={5} placeholder="23:00" bad={badTimes} />
              </View>
              <Card tone="green">
                <Note>{windowNote}</Note>
              </Card>

              <Label>Mesaj tarzı</Label>
              <Chips label="Mesaj tarzı" options={TONES.map((t) => ({ value: t.id, label: t.label }))} selected={settings.tone} onSelect={(t: Tone) => void savePrefs({ tone: t })} />
              <Note>{MESSAGES[settings.tone].description}</Note>
              <LinkRow label="Mesaj örneklerini gör" onPress={() => setSheet('messages')} />

              {nothingFits ? (
                <Card tone="peach">
                  <Text style={styles.warnTitle}>Bu saatlerde hiç hatırlatma gelmez</Text>
                  <Note>{`Uyanık sürün (${Math.floor(awakeSpanMin(wakeNow, sleepNow) / 60)} sa ${awakeSpanMin(wakeNow, sleepNow) % 60} dk) hatırlatma aralığından (${settings.intervalMin / 60} saat) uzun değil. Uyuma saatini ileri al ya da aralığı kısalt.`}</Note>
                </Card>
              ) : null}

              <Label>Tanılama</Label>
              <Note>
                {schedule === null ? 'Planlı hatırlatma okunuyor…' : schedule.count === 0 ? 'Planlı hatırlatma yok.' : `Planlı hatırlatma: ${schedule.count}${schedule.next ? ` · sıradaki: ${nextLabel(schedule.next)}` : ''}`}
              </Note>
              <PrimaryButton label="Test bildirimi gönder" onPress={() => void sendTest()} />
              {testMsg ? <Note>{testMsg}</Note> : null}
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
        <Note>Hatırlatmalar bu telefonda planlanır ve internet gerektirmez. Uygulamayı birkaç gün hiç açmazsan hatırlatmalar durur; açınca yeniden başlar.</Note>
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
  warnTitle: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.peachInk },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  row: { flexDirection: 'row', gap: 10 },
});
