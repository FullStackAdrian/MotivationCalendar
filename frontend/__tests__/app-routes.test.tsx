import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { describeNative } from './helpers/projects';
import Index from '../app/index';
import RootLayout from '../app/_layout';
import { AuthProvider } from '../src/contexts/auth-context';
import LoginRoute from '../app/login';
import RegisterRoute from '../app/register';
import LoginScreen from '../src/screens/login-screen';
import CalendarRoute from '../app/calendar';
import KanbanRoute from '../app/kanban';
import ArchiveRoute from '../app/archive';
import RegisterScreen from '../src/screens/register-screen';
import CalendarScreen from '../src/screens/calendar-screen';
import KanbanScreen from '../src/screens/kanban-screen';
import ArchiveScreen from '../src/screens/archive-screen';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{`redirect:${href}`}</Text>;
  },
  Stack: () => null,
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('axios', () => {
  const instance = {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  return { create: jest.fn(() => instance), __instance: instance };
});


describeNative('app routes', () => {
  it('re-export their screens', () => {
    expect(LoginRoute).toBe(LoginScreen);
    expect(RegisterRoute).toBe(RegisterScreen);
    expect(CalendarRoute).toBe(CalendarScreen);
    expect(KanbanRoute).toBe(KanbanScreen);
    expect(ArchiveRoute).toBe(ArchiveScreen);
  });

  it('redirects to login when there is no session', async () => {
    const { findByText } = render(
      <AuthProvider>
        <Index />
      </AuthProvider>
    );
    expect(await findByText('redirect:/login')).toBeTruthy();
  });

  it('renders the layout with its navigation stack', () => {
    const { UNSAFE_root } = render(<RootLayout />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('redirects to the calendar for an active session', async () => {
    const secure = jest.mocked(SecureStore);
    const token = 'eyJhbGciOiJub25lIn0.eyJpZCI6InUxIiwidXNlcm5hbWUiOiJhbGljZSIsImVtYWlsIjoiYUBiLmNvbSIsImV4cCI6MjAwMDAwMDAwMH0.x';
    secure.getItemAsync.mockResolvedValueOnce(token);
    const { findByText } = render(
      <AuthProvider>
        <Index />
      </AuthProvider>
    );
    expect(await findByText('redirect:/calendar')).toBeTruthy();
  });
});
