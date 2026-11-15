import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Keyboard, TextInput } from 'react-native';
import { useAuth } from '../src/contexts/auth-context';
import { describeNative } from './helpers/projects';
import LoginScreen from '../src/screens/login-screen';
import RegisterScreen from '../src/screens/register-screen';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack }),
}));

jest.mock('../src/contexts/auth-context', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseAuth = jest.mocked(useAuth);

function authState(overrides: Partial<ReturnType<typeof useAuth>> = {}): ReturnType<typeof useAuth> {
  return {
    user: null,
    loading: false,
    sessionExpired: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  };
}

type KbHandler = () => void;
const showHandlers: KbHandler[] = [];
const hideHandlers: KbHandler[] = [];
let keyboardSpy: jest.SpyInstance;

function pressShow(): void {
  for (const handler of showHandlers) handler();
}
function pressHide(): void {
  for (const handler of hideHandlers) handler();
}

beforeEach(() => {
  jest.clearAllMocks();
  showHandlers.length = 0;
  hideHandlers.length = 0;
  mockUseAuth.mockReturnValue(authState());
  keyboardSpy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, handler: KbHandler) => {
    (event === 'keyboardDidShow' ? showHandlers : hideHandlers).push(handler);
    return { remove: jest.fn() };
  }) as never);
});

afterEach(() => {
  keyboardSpy.mockRestore();
});

describeNative('KB-01/KB-04 hero oculto con teclado', () => {
  it('login oculta el logo 2026 cuando el teclado se abre y lo restaura al cerrarse', () => {
    const { getByText, queryByText, unmount } = render(<LoginScreen />);
    expect(getByText('2026')).toBeTruthy();
    pressShow();
    expect(queryByText('2026')).toBeNull();
    expect(queryByText('Cada día que pasa, ya no vuelve')).toBeNull();
    pressHide();
    expect(getByText('2026')).toBeTruthy();
    unmount();
  });

  it('register oculta el logo cuando el teclado se abre', () => {
    const { getByText, queryByText, unmount } = render(<RegisterScreen />);
    expect(getByText('2026')).toBeTruthy();
    pressShow();
    expect(queryByText('2026')).toBeNull();
    unmount();
  });
});

describeNative('KB-02 avance y envío desde el teclado', () => {
  function identifierAndPassword(): { identifier: unknown; password: unknown } {
    const { UNSAFE_getAllByType } = render(<LoginScreen />);
    const inputs = UNSAFE_getAllByType(TextInput) as unknown as Array<{ props: Record<string, unknown> }>;
    const identifier = inputs[0];
    const password = inputs[1];
    return { identifier, password };
  }

  it('login encadena foco con returnKeyType next/done', () => {
    const { identifier, password } = identifierAndPassword();
    expect(identifier.props.returnKeyType).toBe('next');
    expect(password.props.returnKeyType).toBe('done');
    expect(typeof identifier.props.onSubmitEditing).toBe('function');
    expect(typeof password.props.onSubmitEditing).toBe('function');
  });

  it('register encadena foco en sus tres campos', () => {
    const { UNSAFE_getAllByType } = render(<RegisterScreen />);
    const inputs = UNSAFE_getAllByType(TextInput) as unknown as Array<{ props: Record<string, unknown> }>;
    expect(inputs).toHaveLength(3);
    expect(inputs[0].props.returnKeyType).toBe('next');
    expect(inputs[1].props.returnKeyType).toBe('next');
    expect(inputs[2].props.returnKeyType).toBe('done');
  });

  it('password con submit envía el login con credenciales recortadas', async () => {
    const login = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(authState({ login }));
    const { getAllByDisplayValue, UNSAFE_getAllByType } = render(<LoginScreen />);
    const [identifier, password] = getAllByDisplayValue('');
    fireEvent.changeText(identifier, '  nigg  ');
    fireEvent.changeText(password, '123456');
    const inputs = UNSAFE_getAllByType(TextInput) as unknown as Array<{ props: { onSubmitEditing?: () => void } }>;
    inputs[1].props.onSubmitEditing?.();
    await waitFor(() => expect(login).toHaveBeenCalledWith('nigg', '123456'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/calendar'));
  });

  it('no envía con campos vacíos desde el teclado', async () => {
    const login = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(authState({ login }));
    const { UNSAFE_getAllByType } = render(<LoginScreen />);
    const inputs = UNSAFE_getAllByType(TextInput) as unknown as Array<{ props: { onSubmitEditing?: () => void } }>;
    inputs[1].props.onSubmitEditing?.();
    expect(login).not.toHaveBeenCalled();
  });
});
