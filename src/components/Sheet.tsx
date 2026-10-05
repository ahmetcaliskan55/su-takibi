import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { DisplayText } from './DisplayText';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Panelin üstünde görünen katman (ör. "Geri al" bildirimi). */
  overlay?: ReactNode;
}

/** Alttan açılan panel (prototipteki yuvarlak köşeli krem sayfa). Android geri tuşu paneli kapatır. */
export function Sheet({ title, onClose, children, overlay }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Paneli kapat" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none" style={styles.kav}>
          <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: 22 + insets.bottom }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <DisplayText accessibilityRole="header" style={styles.title}>
                {title}
              </DisplayText>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" style={styles.close}>
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M6 6l12 12M18 6L6 18" fill="none" stroke={colors.ink} strokeWidth={2.6} strokeLinecap="round" />
                </Svg>
              </Pressable>
            </View>
            {children}
          </View>
        </KeyboardAvoidingView>
        {overlay ? <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { top: insets.top + 8 }]}>{overlay}</View> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(61, 43, 34, 0.5)' },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    paddingTop: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.cream,
    gap: 12,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#D9C3AE' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 23, lineHeight: 28 },
  close: { width: 44, height: 44, marginRight: -8, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
