import { View } from 'react-native';
import { ComingSoon } from '@/components/ComingSoon';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function SettingsScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader eyebrow="Uygulama tercihlerin" title="Ayarlar" titleFont="bodyHeavy" />
      <ComingSoon
        heading="Ayarlar sonraki aşamalarda geliyor"
        body="Profil, hedef, hatırlatmalar ve veri silme henüz yok. Şimdilik yalnızca Bugün ekranı çalışıyor."
      />
    </View>
  );
}
