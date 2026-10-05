import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { DisplayText } from './DisplayText';

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  /** Geri alınamaz bir işlemse onay düğmesi kırmızı olur. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Ortada açılan onay penceresi (prototipteki "Tüm veriler silinsin mi?" iletişim kutusu). */
export function ConfirmDialog({ title, body, confirmLabel, cancelLabel, busy, destructive, onConfirm, onCancel }: Props) {
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <View accessibilityViewIsModal accessibilityRole="alert" style={styles.card}>
          <DisplayText accessibilityRole="header" style={styles.title}>
            {title}
          </DisplayText>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            <Pressable onPress={onCancel} disabled={busy} accessibilityRole="button" style={[styles.btn, styles.cancel]}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} disabled={busy} accessibilityRole="button" accessibilityState={{ busy: !!busy, disabled: !!busy }} style={[styles.btn, destructive ? styles.danger : styles.ok, busy && { opacity: 0.6 }]}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(61, 43, 34, 0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, padding: 20, borderRadius: 28, backgroundColor: colors.cream, gap: 12 },
  title: { fontSize: 22, lineHeight: 28 },
  body: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  cancel: { borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white },
  cancelText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  danger: { backgroundColor: colors.error },
  ok: { backgroundColor: colors.green },
  confirmText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.white, textAlign: 'center' },
});
