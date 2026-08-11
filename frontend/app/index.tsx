import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { theme } from '@/theme';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.ink} /></View>;
  return <Redirect href={user ? '/calendar' : '/login'} />;
}
