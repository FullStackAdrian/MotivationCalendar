import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Field, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { SESSION_EXPIRED_NOTICE, friendlyAuthError } from '@/screens/auth-error';
import { theme } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login, sessionExpired } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const keyboardOpen = useKeyboardVisible();

  const canSubmit = !loading && identifier.trim().length > 0 && password.length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true); setError('');
    try { await login(identifier.trim(), password); router.replace('/calendar'); }
    catch (e) { setError(friendlyAuthError(e, 'Error al iniciar sesión')); }
    finally { setLoading(false); }
  };

  return <Screen style={styles.center}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.avoid}><ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
    {keyboardOpen ? null : (<><Text style={styles.logo}>2026</Text><Text style={styles.subtitle}>Cada día que pasa, ya no vuelve</Text></>)}
    <View style={styles.form}><Field label="Usuario o email" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => passwordRef.current?.focus()} /><Field ref={passwordRef} label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry returnKeyType="done" onSubmitEditing={submit} />
      {sessionExpired ? <Text style={styles.notice}>{SESSION_EXPIRED_NOTICE}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}<PrimaryButton title={loading ? 'Entrando…' : 'Entrar'} onPress={submit} disabled={!canSubmit} />
      <SecondaryButton title="Crear cuenta" onPress={() => router.push('/register')} />
    </View>
  </ScrollView></KeyboardAvoidingView></Screen>;
}

const styles = StyleSheet.create({ center: { justifyContent: 'center' }, avoid: { flex: 1, width: '100%' }, container: { width: '100%', maxWidth: 420, alignSelf: 'center', paddingVertical: 40, flexGrow: 1, justifyContent: 'center', paddingBottom: 48 }, logo: { fontFamily: 'serif', fontSize: 72, color: theme.colors.ink, textAlign: 'center' }, subtitle: { color: theme.colors.inkMid, textAlign: 'center', fontStyle: 'italic', letterSpacing: 2, marginBottom: 40 }, form: { gap: 16, backgroundColor: theme.colors.white, padding: 28, borderRadius: theme.radius.lg }, notice: { backgroundColor: '#fff8e1', color: theme.colors.ink, padding: 12, borderRadius: theme.radius.sm, overflow: 'hidden' }, error: { backgroundColor: '#ffebee', color: theme.colors.error, padding: 12, borderRadius: theme.radius.sm, overflow: 'hidden' } });
