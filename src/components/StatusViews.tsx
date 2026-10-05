import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/** Yüklenme ekranı. Font henüz yüklenmemiş olabilir; bu yüzden sistem fontu kullanır. */
export function LoadingView({ label = 'Saksı hazırlanıyor…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.green} />
      <Text style={styles.sysText}>{label}</Text>
    </View>
  );
}

export function ErrorView({
  title,
  message,
  onRetry,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center} accessibilityRole="alert">
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryText}>Tekrar dene</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
  },
  sysText: { fontSize: 15, color: colors.inkSoft },
  title: { fontFamily: fonts.bodyHeavy, fontSize: 20, color: colors.ink, textAlign: 'center' },
  message: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: colors.inkSoft, textAlign: 'center' },
  retry: {
    marginTop: 6,
    height: 52,
    paddingHorizontal: 28,
    borderRadius: 20,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryPressed: { opacity: 0.85 },
  retryText: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.white },
});
