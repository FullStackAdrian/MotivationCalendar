import React from 'react';
import { Linking, Platform } from 'react-native';
import { SecondaryButton } from './ui';
import { getApkDownloadUrl } from '../infrastructure/download/apk-download';

export function DownloadApkButton({ testID = 'download-apk-button' }: { testID?: string }) {
  if (Platform.OS !== 'web') return null;
  const open = (): void => {
    Linking.openURL(getApkDownloadUrl()).catch(() => undefined);
  };
  return (
    <SecondaryButton
      title="Descargar app Android (APK)"
      iconName="archive-outline"
      testID={testID}
      onPress={open}
    />
  );
}
