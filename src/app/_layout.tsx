import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { LoadingView } from '@/components/StatusViews';
import { DatabaseProvider, useSettingsRepository } from '@/state/DatabaseProvider';
import { SettingsProvider, useSettings } from '@/state/SettingsProvider';
import { colors } from '@/theme/colors';
import { fontAssets } from '@/theme/fonts';

/** İlk kurulum tamamlanmadıysa onu, tamamlandıysa uygulamayı gösterir. */
function AppGate() {
  const { settings, reload } = useSettings();
  const repo = useSettingsRepository();
  if (!settings.onboardingDone) return <OnboardingFlow repo={repo} onDone={() => void reload()} />;
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
      <DatabaseProvider>
        <SettingsProvider>
          <AppGate />
        </SettingsProvider>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
