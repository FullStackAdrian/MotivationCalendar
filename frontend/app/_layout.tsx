import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/contexts/auth-context';
import { theme } from '@/theme';

export default function RootLayout() {
  return <AuthProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }} /></AuthProvider>;
}
