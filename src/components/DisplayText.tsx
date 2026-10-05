import { Text, type TextProps } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts, fredokaLacksGlyphs } from '@/theme/fonts';

interface Props extends TextProps {
  children: string;
  /** `number`: büyük rakamlar (Fredoka SemiBold), `title`: başlıklar (Fredoka Medium). */
  variant?: 'title' | 'number';
}

/**
 * Prototipteki Fredoka başlık/rakam metni. Pakettaki Fredoka'da ğ/ş/İ olmadığından, bu harfleri içeren metin
 * otomatik olarak Nunito ExtraBold ile çizilir; karışık yazı tipi ya da sistem fontuna düşme olmaz.
 */
export function DisplayText({ children, variant = 'title', style, ...rest }: Props) {
  const family = fredokaLacksGlyphs(children) ? fonts.bodyHeavy : variant === 'number' ? fonts.number : fonts.title;
  return (
    <Text {...rest} style={[{ fontFamily: family, color: colors.ink }, style]}>
      {children}
    </Text>
  );
}
