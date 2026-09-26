import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Icon, IconName } from '@/components/icon';
import { theme } from '@/theme';

export function Screen({ children, style, dense = false }: { children: React.ReactNode; style?: ViewStyle; dense?: boolean }) {
  return <View style={[styles.screen, dense && styles.denseScreen, style]}>{children}</View>;
}

interface BaseButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
  iconName?: IconName;
  iconSide?: 'left' | 'right';
}

export function PrimaryButton({ title, onPress, disabled = false, compact = false, fullWidth = false, iconName, iconSide = 'left' }: BaseButtonProps) {
  const content = (
    <>
      {iconName && iconSide === 'left' ? (
        <View style={styles.iconWrap}><Icon name={iconName} size={compact ? theme.iconSize.sm : theme.iconSize.md} color={theme.colors.white} /></View>
      ) : null}
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact]} numberOfLines={1}>{title}</Text>
      {iconName && iconSide === 'right' ? (
        <View style={styles.iconWrap}><Icon name={iconName} size={compact ? theme.iconSize.sm : theme.iconSize.md} color={theme.colors.white} /></View>
      ) : null}
    </>
  );
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.button, compact && styles.buttonCompact, fullWidth && styles.fullWidth, disabled && styles.disabled]}>{content}</Pressable>;
}

export function SecondaryButton({ title, onPress, disabled = false, compact = false, fullWidth = false, iconName, iconSide = 'left' }: BaseButtonProps) {
  const content = (
    <>
      {iconName && iconSide === 'left' ? (
        <View style={styles.iconWrap}><Icon name={iconName} size={compact ? theme.iconSize.sm : theme.iconSize.md} color={theme.colors.inkMid} /></View>
      ) : null}
      <Text style={[styles.secondaryText, compact && styles.secondaryTextCompact]} numberOfLines={1}>{title}</Text>
      {iconName && iconSide === 'right' ? (
        <View style={styles.iconWrap}><Icon name={iconName} size={compact ? theme.iconSize.sm : theme.iconSize.md} color={theme.colors.inkMid} /></View>
      ) : null}
    </>
  );
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.secondary, compact && styles.secondaryCompact, fullWidth && styles.fullWidth, disabled && styles.disabled]}>{content}</Pressable>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor={theme.colors.inkMid} style={[styles.input, props.multiline && styles.multiline]} /></View>;
}

export function Badge({ label, backgroundColor = theme.colors.surface }: { label: string; backgroundColor?: string }) {
  return <View style={[styles.badge, { backgroundColor }]}><Text style={styles.badgeText}>{label}</Text></View>;
}

export function AppHeader({ title, subtitle, right, stack = false }: { title: string; subtitle?: string; right?: React.ReactNode; stack?: boolean }) {
  return <View style={[styles.header, stack && styles.headerStack]}><View style={styles.headerText}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>{right}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl },
  denseScreen: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.lg },
  button: { backgroundColor: theme.colors.ink, borderRadius: theme.radius.sm, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.lg, gap: 6 },
  buttonCompact: { minHeight: 40, paddingHorizontal: theme.spacing.md },
  buttonText: { color: theme.colors.white, fontSize: theme.typography.body, fontWeight: '500' },
  buttonTextCompact: { fontSize: theme.typography.small },
  disabled: { opacity: 0.55 },
  secondary: { borderWidth: 1, borderColor: theme.colors.inkFaint, borderRadius: theme.radius.sm, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.md, gap: 6 },
  secondaryCompact: { minHeight: 36, paddingHorizontal: theme.spacing.sm },
  fullWidth: { width: '100%', alignSelf: 'stretch' },
  secondaryText: { color: theme.colors.inkMid, fontSize: theme.typography.small },
  secondaryTextCompact: { fontSize: 13 },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  field: { gap: 6, minWidth: 0, flex: 1 },
  label: { color: theme.colors.inkMid, fontSize: 13, letterSpacing: 0.6 },
  input: { backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.inkFaint, borderRadius: theme.radius.sm, minHeight: 46, paddingHorizontal: 14, color: theme.colors.ink, fontSize: theme.typography.body },
  multiline: { minHeight: 80, paddingTop: 10, textAlignVertical: 'top' },
  badge: { borderRadius: theme.radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: theme.colors.ink, fontSize: 11, fontWeight: '500' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: theme.spacing.xl, gap: theme.spacing.md },
  headerStack: { flexDirection: 'column', alignItems: 'stretch', gap: theme.spacing.md },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: theme.colors.ink, fontSize: theme.typography.title, fontFamily: 'serif' },
  subtitle: { color: theme.colors.inkMid, fontSize: theme.typography.small, marginTop: 4 },
});
