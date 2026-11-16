import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Keyboard, Platform, KeyboardAvoidingView, StyleSheet } from 'react-native';
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

// El preset RN polifilea requestAnimationFrame con un setTimeout real
// (setup.js: setTimeout(() => callback(jest.now()), 0)). En runners lentos ese
// timer dispara tras el teardown del fichero y jest aborta con exit 1 aunque
// todo esté en verde. Se mockea síncrono como ya hace keyboard-modal-scroll.
let rafSpy: jest.SpyInstance;

beforeEach(() => {
  rafSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(((callback: () => void) => {
    callback();
    return 0;
  }) as never);
});

afterEach(() => {
  rafSpy.mockRestore();
});

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
    const { findByText, getByText, UNSAFE_queryAllByType } = render(<KanbanScreen />);
    await findByText('Sin tareas');
    fireEvent.press(getByText('Nueva tarea'));
    await findByText('Crear tarea');
    const nodes = UNSAFE_queryAllByType(KeyboardAvoidingView) as any[];
    for (const n of nodes) expect(n.props.behavior).not.toBe('height');
  });

  it('kanban ModalShell añade padding inferior con la altura del teclado en Android', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const showHandlers: Array<(event: { endCoordinates: { height: number } }) => void> = [];
    const keyboardSpy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, handler: (event: { endCoordinates: { height: number } }) => void) => {
      if (event === 'keyboardDidShow') showHandlers.push(handler);
      return { remove: jest.fn() };
    }) as never);
    try {
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
      const { View } = require('react-native') as { View: React.ComponentType<unknown> };
      const views = UNSAFE_getAllByType(View) as any[];
      const paddedBefore = views.filter((v) => StyleSheet.flatten(v.props.style)?.paddingBottom === 500);
      expect(paddedBefore).toHaveLength(0);
      act(() => {
        for (const handler of showHandlers) handler({ endCoordinates: { height: 500 } });
      });
      const paddedAfter = UNSAFE_getAllByType(View).filter(
        (v: any) => StyleSheet.flatten(v.props.style)?.paddingBottom === 500
      );
      expect(paddedAfter.length).toBeGreaterThan(0);
    } finally {
      keyboardSpy.mockRestore();
    }
  });
});
