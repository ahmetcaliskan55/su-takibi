import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatMl } from '@/domain/date';
import { messageRows } from '@/domain/messages';
import { GLASS_OPTIONS_ML, parseGlassAmount, type Tone } from '@/domain/profile';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { Card, Chips, ErrorText, Field, Label, Note } from './form';
import { Sheet } from './Sheet';

interface GlassProps {
  glassMl: number;
  /** Başarılıysa `true` döner (panel kapanır); başarısızsa hata metni. */
  onSave: (ml: number) => Promise<string | null>;
  onClose: () => void;
}

/** Bardak / şişe miktarı: hazır seçenekler ya da özel miktar (50–2.000 ml). */
export function GlassSheet({ glassMl, onSave, onClose }: GlassProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = async (ml: number) => {
    const err = await onSave(ml);
    if (err) setError(err);
    else onClose();
  };

  const apply = () => {
    const parsed = parseGlassAmount(draft);
    if (!parsed.ok) return setError(parsed.message);
    void save(parsed.value);
  };

  return (
    <Sheet title="Bardak / şişe miktarı" onClose={onClose}>
      <View style={styles.current} accessibilityLabel={`Şu an seçili: ${formatMl(glassMl)} mililitre`}>
        <Text style={styles.currentLabel}>Şu an seçili</Text>
        <Text style={styles.currentValue}>{`${formatMl(glassMl)} ml`}</Text>
      </View>

      <Label>Hazır miktarlar (ml)</Label>
      <Chips label="Bardak miktarı" options={GLASS_OPTIONS_ML.map((v) => ({ value: v, label: String(v) }))} selected={GLASS_OPTIONS_ML.some((v) => v === glassMl) ? glassMl : null} onSelect={(v) => void save(v)} />

      <Label>Ya da kendi miktarını yaz</Label>
      <View style={styles.customRow}>
        <Field label="Özel miktar (ml)" value={draft} onChangeText={(t) => (setDraft(t.replace(/\D/g, '').slice(0, 4)), setError(null))} onSubmitEditing={apply} keyboardType="number-pad" maxLength={4} bad={!!error} />
        <Pressable onPress={apply} accessibilityRole="button" style={styles.apply}>
          <Text style={styles.applyText}>Uygula</Text>
        </Pressable>
      </View>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Note>Su ekle panelinde bu miktar hazır seçili gelir.</Note>
    </Sheet>
  );
}

/** Seçili tarz ve aralığa göre hatırlatma / balon mesaj örnekleri. */
export function MessagesSheet({ tone, intervalMin, label, onClose }: { tone: Tone; intervalMin: number; label: string; onClose: () => void }) {
  const rows = messageRows(tone, intervalMin);
  return (
    <Sheet title="Mesaj örnekleri" onClose={onClose}>
      <Text style={styles.intro}>{`Seçili tarz: ${label}`}</Text>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {rows.map((r) => (
          <Card key={r.when}>
            <Text style={styles.when}>{r.when}</Text>
            <Text style={styles.main}>{r.main}</Text>
            <Text style={styles.alt}>{r.alt}</Text>
          </Card>
        ))}
        <Text style={styles.foot}>
          Son seviyeden sonra ton sertleşmez. Su kaydı gelince süre ve seviye başa döner. Uyku saatlerinde ve hedef tamamlanınca bildirim gönderilmez. Uygulama içtiğini algılamaz; yalnızca kayıtlarına bakar.
        </Text>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  current: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.greenLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  currentLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.greenText },
  currentValue: { fontFamily: fonts.bodyHeavy, fontSize: 20, color: colors.greenDark },
  customRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  apply: { height: 52, paddingHorizontal: 22, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.white },
  intro: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  list: { flexGrow: 0 },
  listContent: { gap: 8, paddingBottom: 6 },
  when: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.green },
  main: { fontFamily: fonts.bodyHeavy, fontSize: 15, lineHeight: 20, color: colors.ink },
  alt: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  foot: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 19, color: colors.inkSoft, marginTop: 4 },
});
