import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { LinkRow } from '@/components/form';
import { ComingSoon } from '@/components/ComingSoon';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function SettingsScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader eyebrow="Uygulama tercihlerin" title="Ayarlar" />
      <View style={{ marginHorizontal: 20, marginTop: 20 }}>
        <LinkRow label="Hedef ve profil" onPress={() => router.push('/profile')} />
      </View>
      <ComingSoon
        heading="Diğer ayarlar sonraki aşamalarda geliyor"
        body="Hatırlatmalar ve veri silme henüz yok."
      />
    </View>
  );
}
