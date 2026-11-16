import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Field, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { friendlyAuthError } from '@/screens/auth-error';
import { theme } from '@/theme';

export default function RegisterScreen() {
  const router = useRouter(); const { register } = useAuth();
  const [username, setUsername] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const keyboardOpen = useKeyboardVisible();

  const canSubmit = !loading && username.trim().length > 0 && email.trim().length > 0 && password.length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true); setError('');
    try { await register(username.trim(), email.trim(), password); router.replace('/calendar'); }
    catch (e) { setError(friendlyAuthError(e, 'Error al registrar')); }
    finally { setLoading(false); }
  };
  return (
    <Screen style={styles.center}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.avoid}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
          {keyboardOpen ? null : (<><Text style={styles.logo}>2026</Text><Text style={styles.subtitle}>Empieza a aprovechar tus días</Text></>)}
          <View style={styles.form}><Field label="Usuario" value={username} onChangeText={setUsername} autoCapitalize="none" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => emailRef.current?.focus()} /><Field ref={emailRef} label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => passwordRef.current?.focus()} /><Field ref={passwordRef} label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry returnKeyType="done" onSubmitEditing={submit} />{error ? <Text style={styles.error}>{error}</Text> : null}<PrimaryButton title={loading ? 'Creando…' : 'Crear cuenta'} onPress={submit} disabled={!canSubmit} /><SecondaryButton title="Ya tengo cuenta" onPress={() => router.back()} /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
const styles = StyleSheet.create({ center: { justifyContent: 'center' }, avoid: { flex: 1, width: '100%' }, container: { width: '100%', maxWidth: 420, alignSelf: 'center', paddingVertical: 40, flexGrow: 1, justifyContent: 'center', paddingBottom: 48 }, logo: { fontFamily: 'serif', fontSize: 72, color: theme.colors.ink, textAlign: 'center' }, subtitle: { color: theme.colors.inkMid, textAlign: 'center', fontStyle: 'italic', letterSpacing: 2, marginBottom: 40 }, form: { gap: 16, backgroundColor: theme.colors.white, padding: 28, borderRadius: theme.radius.lg }, error: { backgroundColor: '#ffebee', color: theme.colors.error, padding: 12, borderRadius: theme.radius.sm, overflow: 'hidden' } });
