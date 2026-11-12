import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import { describeNative } from './helpers/projects';
import { DownloadApkButton } from '../src/components/download-apk-button';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
}));

describeNative('DownloadApkButton', () => {
  const OLD_OS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    delete process.env.EXPO_PUBLIC_ANDROID_APK_URL;
    process.env.EXPO_PUBLIC_API_URL = 'https://backend.example.com';
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: OLD_OS, configurable: true });
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it('renders a download button on web pointing at the same backend as the web app', () => {
    const { getByText, getByTestId } = render(<DownloadApkButton />);
    expect(getByText('Descargar app Android (APK)')).toBeTruthy();
    expect(getByTestId('download-apk-button')).toBeTruthy();
  });

  it('opens the backend-derived apk url on press', () => {
    const { getByTestId } = render(<DownloadApkButton />);
    fireEvent.press(getByTestId('download-apk-button'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://backend.example.com/downloads/motivation-calendar.apk'
    );
  });

  it('renders nothing outside web (native app already installed)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const { queryByTestId } = render(<DownloadApkButton />);
    expect(queryByTestId('download-apk-button')).toBeNull();
  });
});
