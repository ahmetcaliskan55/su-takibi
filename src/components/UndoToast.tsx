import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

interface Props {
  message: string;
  onUndo: () => void;
  /** Konum: ekranın altı (varsayılan) ya da üstü (panel açıkken). */
  style?: ViewStyle;
}

/** "Geri al" bildirimi (prototipteki koyu hap). Görünme süresini çağıran taraf yönetir. */
export function UndoToast({ message, onUndo, style }: Props) {
  return (
    <View accessibilityLiveRegion="polite" style={[styles.toast, style]}>
      <Text style={styles.text}>{message}</Text>
      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        accessibilityLabel={`${message}. Geri al`}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      >
        <Text style={styles.btnText}>Geri al</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 52,
    paddingVertical: 4,
    paddingLeft: 18,
    paddingRight: 6,
    borderRadius: 20,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  text: { flexShrink: 1, fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.white },
  btn: { height: 44, paddingHorizontal: 16, borderRadius: 16, justifyContent: 'center' },
  btnPressed: { backgroundColor: 'rgba(255,255,255,0.12)' },
  btnText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: '#FFD46B' },
});
