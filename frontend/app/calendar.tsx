import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import CalendarScreen from '@/screens/calendar-screen';
import { theme } from '@/theme';

/** BETA-3: ruta protegida — sin sesión redirige a /login en vez de renderizar con error. */
export default function CalendarRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.ink} /></View>;
  }
  if (!user) return <Redirect href="/login" />;
  return <CalendarScreen />;
}
