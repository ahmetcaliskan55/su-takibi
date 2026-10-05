import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

interface Props {
  eyebrow: string;
  title: string;
  /** Başlıkta ğ/ş/İ varsa Fredoka'da glif yok; Nunito kullan. */
  titleFont?: 'title' | 'bodyHeavy';
  right?: React.ReactNode;
}

export function ScreenHeader({ eyebrow, title, titleFont = 'title', right }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text accessibilityRole="header" style={[styles.title, { fontFamily: fonts[titleFont] }]}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 24,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  texts: { gap: 2, flexShrink: 1 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  title: { fontSize: 29, lineHeight: 34, color: colors.ink },
});
