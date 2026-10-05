import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { DisplayText } from './DisplayText';

interface Props {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
}

export function ScreenHeader({ eyebrow, title, right }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <DisplayText accessibilityRole="header" style={styles.title}>
          {title}
        </DisplayText>
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
  title: { fontSize: 29, lineHeight: 34 },
});
