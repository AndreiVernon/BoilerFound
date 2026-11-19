import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { HeadlandOne_400Regular } from '@expo-google-fonts/headland-one/400Regular';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DraftProvider } from '../features/found/DraftProvider';
import { colors } from '../theme';

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, HeadlandOne_400Regular });
  if (!loaded && !error) return <View><Text>Loading BoilerFound…</Text></View>;
  return <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <StatusBar style="dark" />
    <DraftProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'none' }} /></DraftProvider>
  </SafeAreaView></SafeAreaProvider>;
}
