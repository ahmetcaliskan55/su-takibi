import { View } from 'react-native';
import { ComingSoon } from '@/components/ComingSoon';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function HistoryScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader eyebrow="Önceki günlerin bitkileri" title="Geçmiş" titleFont="bodyHeavy" />
      <ComingSoon
        heading="Geçmiş sonraki aşamada geliyor"
        body="Takvim ve istatistikler henüz yok. Su kayıtların şimdiden bu telefonda saklanıyor."
      />
    </View>
  );
}
