import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform, KeyboardAvoidingView } from 'react-native';
import { describeNative } from './helpers/projects';
import LoginScreen from '../src/screens/login-screen';
import RegisterScreen from '../src/screens/register-screen';
import KanbanScreen from '../src/screens/kanban-screen';
import axios from 'axios';

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

const http = (): { get: jest.Mock } =>
  (axios as unknown as { __instance: { get: jest.Mock } }).__instance;

describeNative('keyboard avoiding (Android adjustResize)', () => {
  const OLD_OS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: OLD_OS, configurable: true });
    jest.clearAllMocks();
  });

  it('login/register no usan behavior="height" en Android (adjustResize + Scroll mandan)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    for (const Screen of [LoginScreen, RegisterScreen]) {
      const { UNSAFE_getAllByType, unmount } = render(<Screen />);
      const nodes = UNSAFE_getAllByType(KeyboardAvoidingView) as any[];
      expect(nodes.length).toBeGreaterThan(0);
      for (const n of nodes) expect(n.props.behavior).not.toBe('height');
      unmount();
    }
  });

  it('kanban ModalShell no usa behavior="height" en Android', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    http().get.mockImplementation((url: string) => {
      if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint' }] });
      if (url === '/api/kanban/boards/b1')
        return Promise.resolve({
          data: { id: 'b1', name: 'Sprint', columns: [{ id: 'c1', name: 'Todo', color: '#fff', position: 0 }], tasks: [] },
        });
      return Promise.resolve({ data: [] });
    });
    const { findByText, getByText, UNSAFE_getAllByType } = render(<KanbanScreen />);
    await findByText('Sin tareas');
    fireEvent.press(getByText('Nueva tarea'));
    await findByText('Crear tarea');
    const nodes = UNSAFE_getAllByType(KeyboardAvoidingView) as any[];
    expect(nodes.length).toBeGreaterThan(0);
    for (const n of nodes) expect(n.props.behavior).not.toBe('height');
  });
});
