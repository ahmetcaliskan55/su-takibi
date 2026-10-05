import { View } from 'react-native';
import { HomeContent } from '@/components/HomeContent';
import { ErrorView, LoadingView } from '@/components/StatusViews';
import { useWaterRepository } from '@/state/DatabaseProvider';
import { useToday } from '@/state/useToday';

export default function TodayScreen() {
  const repo = useWaterRepository();
  const { state, saving, addError, bubbleEvent, addQuick, retry } = useToday(repo);

  if (state.status === 'loading') return <LoadingView label="Bugün yükleniyor…" />;
  if (state.status === 'error') {
    return <ErrorView title="Bugünün kayıtları okunamadı" message={state.message} onRetry={() => void retry()} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <HomeContent
        day={state.day}
        now={new Date()}
        saving={saving}
        addError={addError}
        bubbleEvent={bubbleEvent}
        onQuickAdd={(ml) => void addQuick(ml)}
      />
    </View>
  );
}
