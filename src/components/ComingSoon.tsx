import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { Plant } from './Plant';

/**
 * Henüz yapılmamış sekmeler için dürüst yer tutucu: işlev varmış izlenimi vermez.
 */
export function ComingSoon({ heading, body }: { heading: string; body: string }) {
  return (
    <View style={styles.card}>
      <Plant stage={0} width={120} />
      <Text style={styles.heading}>{heading}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 24,
    borderRadius: 32,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    gap: 10,
  },
  heading: { fontFamily: fonts.bodyHeavy, fontSize: 18, color: colors.ink, textAlign: 'center' },
  body: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: colors.greenText, textAlign: 'center' },
});
