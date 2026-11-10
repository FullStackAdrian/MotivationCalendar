import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue(authState());
});

describeNative('LoginScreen', () => {
  it('keeps Entrar disabled until both fields are filled', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Usuario o email')).toBeTruthy();
    expect(getByText('Entrar')).toBeTruthy();
  });

  it('logs in with trimmed credentials and navigates to the calendar', async () => {
    const login = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(authState({ login }));
    const { getAllByDisplayValue, getByText } = render(<LoginScreen />);
    const [identifier, password] = getAllByDisplayValue('');
    fireEvent.changeText(identifier, '  alice  ');
    fireEvent.changeText(password, 'secret123');
    fireEvent.press(getByText('Entrar'));
    await waitFor(() => expect(login).toHaveBeenCalledWith('alice', 'secret123'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/calendar'));
  });

  it('shows a pending state while logging in', async () => {
    let resolveLogin!: (value: { token: string; user: object }) => void;
    const login = jest.fn().mockImplementation(() => new Promise((resolve) => { resolveLogin = resolve as never; }));
    mockUseAuth.mockReturnValue(authState({ login }));
    const { getAllByDisplayValue, getByText, queryByText } = render(<LoginScreen />);
    const [identifier, password] = getAllByDisplayValue('');
    fireEvent.changeText(identifier, 'alice');
    fireEvent.changeText(password, 'secret123');
    fireEvent.press(getByText('Entrar'));
    expect(await queryByText('Entrando…')).toBeTruthy();
    resolveLogin({ token: 't', user: { id: 'u1', username: 'alice', email: 'a@b.com' } });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/calendar'));
  });

  it('shows authentication errors without navigating', async () => {
    const login = jest.fn().mockRejectedValue(new Error('Credenciales inválidas'));
    mockUseAuth.mockReturnValue(authState({ login }));
    const { getAllByDisplayValue, getByText, findByText } = render(<LoginScreen />);
    const [identifier, password] = getAllByDisplayValue('');
    fireEvent.changeText(identifier, 'alice');
    fireEvent.changeText(password, 'x');
    fireEvent.press(getByText('Entrar'));
    expect(await findByText('Credenciales inválidas')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('maps connectivity failures to a friendly message', async () => {
    const login = jest.fn().mockRejectedValue(new Error('No permitido por CORS'));
    mockUseAuth.mockReturnValue(authState({ login }));
    const { getAllByDisplayValue, getByText, findByText, queryByText } = render(<LoginScreen />);
    const [identifier, password] = getAllByDisplayValue('');
    fireEvent.changeText(identifier, 'alice');
    fireEvent.changeText(password, 'x');
    fireEvent.press(getByText('Entrar'));
    expect(await findByText('No se pudo conectar con el servidor. Revisa tu conexión.')).toBeTruthy();
    expect(queryByText('No permitido por CORS')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows a session-expired notice', () => {
    mockUseAuth.mockReturnValue(authState({ sessionExpired: true }));
    const { getByText } = render(<LoginScreen />);
    expect(getByText('La sesión ha expirado. Vuelve a entrar.')).toBeTruthy();
  });

  it('navigates to registration', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Crear cuenta'));
    expect(mockPush).toHaveBeenCalledWith('/register');
  });
});

describeNative('RegisterScreen', () => {
  it('registers with trimmed fields and navigates to the calendar', async () => {
    const register = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(authState({ register }));
    const { getAllByDisplayValue, getByText } = render(<RegisterScreen />);
    const [username, email, password] = getAllByDisplayValue('');
    fireEvent.changeText(username, '  bob  ');
    fireEvent.changeText(email, '  BOB@Example.COM  ');
    fireEvent.changeText(password, 'secret123');
    fireEvent.press(getByText('Crear cuenta'));
    await waitFor(() => expect(register).toHaveBeenCalledWith('bob', 'BOB@Example.COM', 'secret123'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/calendar'));
  });

  it('shows registration errors without navigating', async () => {
    const register = jest.fn().mockRejectedValue(new Error('El usuario ya existe'));
    mockUseAuth.mockReturnValue(authState({ register }));
    const { getAllByDisplayValue, getByText, findByText } = render(<RegisterScreen />);
    const [username, email, password] = getAllByDisplayValue('');
    fireEvent.changeText(username, 'bob');
    fireEvent.changeText(email, 'b@b.com');
    fireEvent.changeText(password, 'secret123');
    fireEvent.press(getByText('Crear cuenta'));
    expect(await findByText('El usuario ya existe')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('goes back to login', () => {
    const { getByText } = render(<RegisterScreen />);
    fireEvent.press(getByText('Ya tengo cuenta'));
    expect(mockBack).toHaveBeenCalled();
  });
});
