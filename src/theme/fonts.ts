import { Fredoka_500Medium } from '@expo-google-fonts/fredoka/500Medium';
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';

/**
 * Fontlar uygulamayla birlikte paketlenir (OFL lisanslı Fredoka ve Nunito); internet gerekmez.
 *
 * DİKKAT: Paketteki Fredoka dosyalarında ğ, Ğ, ş, Ş ve İ glifleri YOK (Nunito'da hepsi var).
 * Bu yüzden Fredoka yalnızca rakamlarda ve bu harfleri içermeyen başlıklarda kullanılmalıdır
 * (ör. "Bugünün saksısı"). "Geçmiş", "Ayarlar" gibi ş/ğ/İ içeren başlıklarda `fonts.title` yerine
 * `fonts.bodyHeavy` kullanın. Tam glifli bir Fredoka bulunana kadar bu kural geçerlidir.
 */
export const fontAssets = {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} as const;

export const fonts = {
  /** Fredoka — yalnızca ğ/ş/İ içermeyen başlıklar */
  title: 'Fredoka_500Medium',
  /** Fredoka — büyük rakamlar */
  number: 'Fredoka_600SemiBold',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
} as const;
