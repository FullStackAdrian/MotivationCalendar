import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import { useAuth } from '../src/contexts/auth-context';
import { describeNative } from './helpers/projects';
import CalendarScreen from '../src/screens/calendar-screen';

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: jest.fn() }),
}));

jest.mock('../src/contexts/auth-context', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('axios', () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  return { create: jest.fn(() => instance), __instance: instance };
});

const mockUseAuth = jest.mocked(useAuth);
const http = (): { get: jest.Mock; put: jest.Mock } =>
  (axios as unknown as { __instance: { get: jest.Mock; put: jest.Mock } }).__instance;

function authState(overrides: Partial<ReturnType<typeof useAuth>> = {}): ReturnType<typeof useAuth> {
  return {
    user: { id: 'u1', username: 'alice', email: 'a@b.com' },
    loading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue(authState());
  http().get.mockResolvedValue({ data: { progress: { '2026-01-01': 'completed' } } });
});

describeNative('CalendarScreen', () => {
  it('renders the year, stats and legend', async () => {
    const { getByText, getAllByText, findByText } = render(<CalendarScreen />);
    await findByText('Cada día que pasa, ya no vuelve');
    expect(getByText('Hola, alice')).toBeTruthy();
    expect(getAllByText('Todo bien').length).toBeGreaterThanOrEqual(2);
    expect(getByText('Días restantes')).toBeTruthy();
    expect(getByText('365 oportunidades', { exact: false })).toBeTruthy();
  });

  it('navigates to kanban and logs out', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(authState({ logout }));
    const { getByText, findByText } = render(<CalendarScreen />);
    await findByText('Cada día que pasa, ya no vuelve');
    fireEvent.press(getByText('Kanban'));
    expect(mockPush).toHaveBeenCalledWith('/kanban');
    fireEvent.press(getByText('Salir'));
    await waitFor(() => expect(logout).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('shows an error when progress cannot load', async () => {
    http().get.mockRejectedValue(new Error('caído'));
    const { findByText } = render(<CalendarScreen />);
    expect(await findByText('caído')).toBeTruthy();
  });

  it('rotates a future day through partial and failed before clearing it', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-05T12:00:00Z'));
    try {
      http().put.mockResolvedValue({ data: { progress: {} } });
      const { getByLabelText, findByText } = render(<CalendarScreen />);
      await findByText('Cada día que pasa, ya no vuelve');
      const day = getByLabelText('Día 180');
      fireEvent.press(day);
      await waitFor(() => expect(http().put).toHaveBeenCalledWith('/api/progress/2026-06-29', { status: 'completed' }, undefined));
      fireEvent.press(day);
      await waitFor(() => expect(http().put).toHaveBeenCalledWith('/api/progress/2026-06-29', { status: 'partial' }, undefined));
      fireEvent.press(day);
      await waitFor(() => expect(http().put).toHaveBeenCalledWith('/api/progress/2026-06-29', { status: 'failed' }, undefined));
      fireEvent.press(day);
      expect(http().put).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('locks past days against changes', async () => {
    const { getByLabelText, findByText } = render(<CalendarScreen />);
    await findByText('Cada día que pasa, ya no vuelve');
    fireEvent.press(getByLabelText('Día 1'));
    expect(http().put).not.toHaveBeenCalled();
  });
});
