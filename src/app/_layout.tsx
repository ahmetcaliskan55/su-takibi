import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { LoadingView } from '@/components/StatusViews';
import { expoDriver } from '@/notifications/expoDriver';
import { NotificationProvider, useNotifications } from '@/notifications/NotificationProvider';
import { ReminderSync } from '@/notifications/ReminderSync';
import { DatabaseProvider, useSettingsRepository } from '@/state/DatabaseProvider';
import { SettingsProvider, useSettings } from '@/state/SettingsProvider';
import { colors } from '@/theme/colors';
import { fontAssets } from '@/theme/fonts';

/** İlk kurulum tamamlanmadıysa onu, tamamlandıysa uygulamayı gösterir. */
function AppGate() {
  const { settings, reload } = useSettings();
  const repo = useSettingsRepository();
  const { requestPermission } = useNotifications();
  if (!settings.onboardingDone) {
    return <OnboardingFlow repo={repo} onRequestPermission={() => requestPermission()} onDone={() => void reload()} />;
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  // Font yüklenemezse uygulama sistem fontuyla yine de açılır.
  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LoadingView />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NotificationProvider driver={expoDriver}>
        <DatabaseProvider>
          <SettingsProvider>
            <ReminderSync />
            <AppGate />
          </SettingsProvider>
        </DatabaseProvider>
      </NotificationProvider>
    </SafeAreaProvider>
  );
}
