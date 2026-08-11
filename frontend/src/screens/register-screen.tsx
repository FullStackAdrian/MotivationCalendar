import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Field, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { theme } from '@/theme';

export default function RegisterScreen() {
  const router = useRouter(); const { register } = useAuth();
  const [username, setUsername] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async () => { setLoading(true); setError(''); try { await register(username.trim(), email.trim(), password); router.replace('/calendar'); } catch (e) { setError(e instanceof Error ? e.message : 'Error al registrar'); } finally { setLoading(false); } };
  return <Screen style={styles.center}><ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled"><Text style={styles.logo}>2026</Text><Text style={styles.subtitle}>Empieza a aprovechar tus días</Text><View style={styles.form}><Field label="Usuario" value={username} onChangeText={setUsername} autoCapitalize="none"/><Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/><Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry/>{error ? <Text style={styles.error}>{error}</Text> : null}<PrimaryButton title={loading ? 'Creando…' : 'Crear cuenta'} onPress={submit} disabled={loading || !username || !email || !password}/><SecondaryButton title="Ya tengo cuenta" onPress={() => router.back()}/></View></ScrollView></Screen>;
}
const styles = StyleSheet.create({ center:{justifyContent:'center'},container:{width:'100%',maxWidth:420,alignSelf:'center',paddingVertical:40},logo:{fontFamily:'serif',fontSize:72,color:theme.colors.ink,textAlign:'center'},subtitle:{color:theme.colors.inkMid,textAlign:'center',fontStyle:'italic',letterSpacing:2,marginBottom:40},form:{gap:16,backgroundColor:theme.colors.white,padding:28,borderRadius:theme.radius.lg},error:{backgroundColor:'#ffebee',color:theme.colors.error,padding:12,borderRadius:theme.radius.sm,overflow:'hidden'}});
