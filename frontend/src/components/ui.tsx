import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { theme } from '@/theme';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function PrimaryButton({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}

export function SecondaryButton({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.secondary, disabled && styles.disabled]}><Text style={styles.secondaryText}>{title}</Text></Pressable>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor={theme.colors.inkMid} style={[styles.input, props.multiline && styles.multiline]} /></View>;
}

export function Badge({ label, backgroundColor = theme.colors.surface }: { label: string; backgroundColor?: string }) {
  return <View style={[styles.badge, { backgroundColor }]}><Text style={styles.badgeText}>{label}</Text></View>;
}

export function AppHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return <View style={styles.header}><View style={styles.headerText}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>{right}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl },
  button: { backgroundColor: theme.colors.ink, borderRadius: theme.radius.sm, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.lg },
  buttonText: { color: theme.colors.white, fontSize: theme.typography.body, fontWeight: '500' },
  disabled: { opacity: 0.55 },
  secondary: { borderWidth: 1, borderColor: theme.colors.inkFaint, borderRadius: theme.radius.sm, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.md },
  secondaryText: { color: theme.colors.inkMid, fontSize: theme.typography.small },
  field: { gap: 6, minWidth: 0, flex: 1 },
  label: { color: theme.colors.inkMid, fontSize: 13, letterSpacing: 0.6 },
  input: { backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.inkFaint, borderRadius: theme.radius.sm, minHeight: 46, paddingHorizontal: 14, color: theme.colors.ink, fontSize: theme.typography.body },
  multiline: { minHeight: 80, paddingTop: 10, textAlignVertical: 'top' },
  badge: { borderRadius: theme.radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: theme.colors.ink, fontSize: 11, fontWeight: '500' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: theme.spacing.xl, gap: theme.spacing.md },
  headerText: { flex: 1 },
  title: { color: theme.colors.ink, fontSize: theme.typography.title, fontFamily: 'serif' },
  subtitle: { color: theme.colors.inkMid, fontSize: theme.typography.small, marginTop: 4 },
});
