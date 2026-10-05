import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoadingView } from '@/components/StatusViews';
import { DatabaseProvider } from '@/state/DatabaseProvider';
import { fontAssets } from '@/theme/fonts';

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
        <Slot />
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
