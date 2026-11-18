import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { isNewerVersion } from '@/domain/app-version';
import {
  AppUpdateRepository,
  resolveUpdateDownloadUrl,
  type AppInfo,
} from '@/infrastructure/download/app-update.repository';
import { theme } from '@/theme';
import appJson from '../../app.json';

/** Versión horneada en el build (misma que publica el backend como APP_VERSION). */
export function getInstalledVersion(): string {
  const version = (appJson as { expo?: { version?: unknown } })?.expo?.version;
  return typeof version === 'string' && version.trim().length > 0 ? version.trim() : '0.0.0';
}

interface SettingsScreenProps {
  currentVersion?: string;
  repository?: { getInfo(): Promise<AppInfo> };
  onOpenUrl?: (url: string) => void;
}

const defaultRepository = new AppUpdateRepository();

function formatSize(sizeBytes: number | null): string | null {
  if (sizeBytes === null) return null;
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SettingsScreen({
  currentVersion = getInstalledVersion(),
  repository = defaultRepository,
  onOpenUrl = (url: string): void => {
    Linking.openURL(url).catch(() => undefined);
  },
}: SettingsScreenProps) {
  const router = useRouter();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  const check = useCallback(async () => {
    setChecking(true);
    setError('');
    try {
      setInfo(await repository.getInfo());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo comprobar la versión');
    } finally {
      setChecking(false);
    }
  }, [repository]);

  useEffect(() => {
    void check();
  }, [check]);

  const hasUpdate = info !== null && info.available === true && isNewerVersion(info.version ?? '', currentVersion);
  const size = info ? formatSize(info.sizeBytes ?? null) : null;
  const announcedUpdate = info !== null && info.available !== true && isNewerVersion(info.version ?? '', currentVersion);

  const download = (): void => {
    if (!info) return;
    onOpenUrl(resolveUpdateDownloadUrl(info));
  };

  return (
    <Screen>
      <AppHeader title="Ajustes" subtitle="Versión y actualizaciones" />
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Versión</Text>
        <Text testID="settings-current-version" style={styles.version}>
          Instalada: {currentVersion}
        </Text>
        {checking && !info ? <Text style={styles.muted}>Comprobando actualizaciones…</Text> : null}
        {error ? <Text testID="settings-error" style={styles.errorText}>{error}</Text> : null}
        {info && typeof info.version === 'string' && info.version ? (
          <Text testID="settings-latest-version" style={styles.version}>
            Disponible: {info.version}{size ? ` (${size})` : ''}
          </Text>
        ) : null}
        {hasUpdate && info ? (
          <Text style={styles.updateText}>Hay una versión más nueva lista para instalar.</Text>
        ) : null}
        {info && info.available === true && !hasUpdate ? (
          <Text testID="settings-up-to-date" style={styles.muted}>Tienes la última versión instalada.</Text>
        ) : null}
        {info && info.available !== true ? (
          <Text testID="settings-not-available" style={styles.muted}>
            {announcedUpdate
              ? `La versión ${info.version} está anunciada pero el APK aún no está publicado en este servidor.`
              : 'La descarga del APK aún no está publicada en este servidor.'}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        {hasUpdate && info ? (
          <PrimaryButton
            testID="settings-update-button"
            title={`Descargar actualización (v${info.version})`}
            iconName="archive-outline"
            onPress={download}
          />
        ) : null}
        <SecondaryButton
          testID="settings-check-button"
          title={checking ? 'Comprobando…' : 'Comprobar actualizaciones'}
          iconName="repeat-outline"
          onPress={() => void check()}
          disabled={checking}
        />
        <SecondaryButton
          testID="settings-back-button"
          title="Volver"
          iconName="arrow-back"
          onPress={() => router.back()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.inkFaint,
    borderRadius: 12,
    padding: theme.spacing.lg,
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: { color: theme.colors.inkMid, fontSize: 13, letterSpacing: 0.6 },
  version: { color: theme.colors.ink, fontSize: theme.typography.body },
  updateText: { color: theme.colors.ink, fontSize: theme.typography.small, fontWeight: '500' },
  muted: { color: theme.colors.inkMid, fontSize: theme.typography.small },
  errorText: { color: theme.colors.error },
  actions: {
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
    gap: 8,
  },
});
