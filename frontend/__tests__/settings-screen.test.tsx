import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useAuth } from '../src/contexts/auth-context';
import { describeNative } from './helpers/projects';
import SettingsScreen from '../src/screens/settings-screen';
import type { AppInfo } from '../src/infrastructure/download/app-update.repository';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

jest.mock('../src/contexts/auth-context', () => ({
  useAuth: jest.fn().mockReturnValue({
    user: { id: 'u1', username: 'alice', email: 'a@b.com' },
    loading: false,
    sessionExpired: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
  }),
}));

const mockUseAuth = jest.mocked(useAuth);

function info(overrides: Partial<AppInfo> = {}): AppInfo {
  return {
    apkUrl: '/downloads/motivation-calendar.apk',
    fileName: 'motivation-calendar.apk',
    version: '1.0.0',
    available: true,
    sizeBytes: 1024,
    updatedAt: '2026-11-18T00:00:00.000Z',
    ...overrides,
  };
}

function repositoryReturning(value: AppInfo | Error) {
  return {
    getInfo: value instanceof Error ? jest.fn().mockRejectedValue(value) : jest.fn().mockResolvedValue(value),
  };
}

describeNative('SettingsScreen', () => {
  it('muestra la versión instalada', async () => {
    const repository = repositoryReturning(info());
    const { getByTestId, findByTestId } = render(<SettingsScreen currentVersion="1.0.0" repository={repository} />);
    expect(getByTestId('settings-current-version')).toBeTruthy();
    await findByTestId('settings-latest-version');
  });

  it('ofrece descargar el APK cuando hay una versión más nueva', async () => {
    const repository = repositoryReturning(info({ version: '1.1.0' }));
    const onOpenUrl = jest.fn();
    const { findByTestId } = render(
      <SettingsScreen currentVersion="1.0.0" repository={repository} onOpenUrl={onOpenUrl} />
    );
    const button = await findByTestId('settings-update-button');
    fireEvent.press(button);
    await waitFor(() => expect(onOpenUrl).toHaveBeenCalled());
    expect(onOpenUrl).toHaveBeenCalledWith(expect.stringContaining('.apk'));
  });

  it('indica que está al día cuando no hay versión nueva', async () => {
    const repository = repositoryReturning(info({ version: '1.0.0' }));
    const { findByTestId, queryByTestId } = render(
      <SettingsScreen currentVersion="1.0.0" repository={repository} />
    );
    await findByTestId('settings-up-to-date');
    expect(queryByTestId('settings-update-button')).toBeNull();
  });

  it('avisa cuando el APK aún no está publicado', async () => {
    const repository = repositoryReturning(info({ version: '1.1.0', available: false, sizeBytes: null, updatedAt: null }));
    const { findByTestId, queryByTestId } = render(
      <SettingsScreen currentVersion="1.0.0" repository={repository} />
    );
    await findByTestId('settings-not-available');
    expect(queryByTestId('settings-update-button')).toBeNull();
  });

  it('muestra el error y permite reintentar la comprobación', async () => {
    const getInfo = jest.fn().mockRejectedValueOnce(new Error('Sin red')).mockResolvedValueOnce(info());
    const { findByTestId, getByTestId } = render(
      <SettingsScreen currentVersion="1.0.0" repository={{ getInfo }} />
    );
    await findByTestId('settings-error');
    fireEvent.press(getByTestId('settings-check-button'));
    await findByTestId('settings-latest-version');
    expect(getInfo).toHaveBeenCalledTimes(2);
  });
});
