import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import axios from 'axios';
import { useAuth } from '../src/contexts/auth-context';
import { describeNative } from './helpers/projects';
import KanbanScreen from '../src/screens/kanban-screen';
import SettingsScreen from '../src/screens/settings-screen';

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

jest.mock('../src/hooks/use-responsive', () => ({
  useResponsive: () => ({ width: 390, height: 844, size: 'mobile', isMobile: true, isTablet: false, isDesktop: false, isCompact: false }),
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
const http = (): { get: jest.Mock; post: jest.Mock; patch: jest.Mock; delete: jest.Mock } =>
  (axios as unknown as { __instance: { get: jest.Mock; post: jest.Mock; patch: jest.Mock; delete: jest.Mock } }).__instance;

function authState(overrides: Partial<ReturnType<typeof useAuth>> = {}): ReturnType<typeof useAuth> {
  return {
    user: { id: 'u1', username: 'alice', email: 'a@b.com' },
    loading: false,
    sessionExpired: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const board = {
  id: 'b1',
  name: 'Sprint',
  columns: [
    { id: 'c1', name: 'Todo', color: '#64748b', position: 0, isDone: false, isPaused: false },
    { id: 'c2', name: 'Hecho', color: '#2E5E18', position: 1, isDone: true, isPaused: false },
  ],
  tasks: [{ id: 't1', title: 'Primera tarea', columnId: 'c1', priority: 'high' as const, tags: [] }],
};

function mockTwoBoards() {
  http().get.mockImplementation((url: string) => {
    if (url === '/api/kanban/boards') {
      return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint' }, { id: 'b2', name: 'Otro' }] });
    }
    if (url === '/api/kanban/boards/b1') return Promise.resolve({ data: board });
    if (url === '/api/kanban/boards/b2') {
      return Promise.resolve({
        data: {
          id: 'b2',
          name: 'Otro',
          columns: [{ id: 'c9', name: 'Cola', color: '#fff', position: 0, isDone: false, isPaused: false }],
          tasks: [{ id: 't9', title: 'Otra tarea', columnId: 'c9', priority: 'low' as const, tags: [] }],
        },
      });
    }
    return Promise.resolve({ data: [] });
  });
}

function mockThreeBoards() {
  http().get.mockImplementation((url: string) => {
    if (url === '/api/kanban/boards') {
      return Promise.resolve({ data: [
        { id: 'b1', name: 'Sprint' },
        { id: 'b2', name: 'Diseño' },
        { id: 'b3', name: 'Lanzamiento' },
      ] });
    }
    if (url === '/api/kanban/boards/b1') return Promise.resolve({ data: board });
    if (url === '/api/kanban/boards/b2') {
      return Promise.resolve({ data: { id: 'b2', name: 'Diseño', columns: [], tasks: [] } });
    }
    if (url === '/api/kanban/boards/b3') {
      return Promise.resolve({ data: { id: 'b3', name: 'Lanzamiento', columns: [], tasks: [] } });
    }
    return Promise.resolve({ data: [] });
  });
}

function mockSingleBoard() {
  http().get.mockImplementation((url: string) => {
    if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint', columns: [] }] });
    if (url === '/api/kanban/boards/b1') return Promise.resolve({ data: board });
    return Promise.resolve({ data: [] });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue(authState());
});

describeNative('UX pizarras: fila 3 acciones con iconos', () => {
  it('expone crear/renombrar/borrar en una misma fila de 3 columnas', async () => {
    mockSingleBoard();
    const { getByTestId, findByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    const row = getByTestId('board-actions-row');
    const rowStyle = StyleSheet.flatten(row.props.style);
    expect(rowStyle.flexDirection).toBe('row');
    // Los 3 botones existen con sus iconos/textos y testIDs estables
    expect(getByTestId('board-create')).toBeTruthy();
    expect(getByTestId('board-rename')).toBeTruthy();
    expect(getByTestId('board-delete')).toBeTruthy();

    // En móvil, las tres acciones deben ocupar menos altura que un botón compacto estándar.
    for (const testID of ['board-create', 'board-rename', 'board-delete']) {
      const button = getByTestId(testID);
      expect(StyleSheet.flatten(button.props.style).minHeight).toBe(36);
    }
  });
});

describeNative('UX pizarras: selector deslizable', () => {
  it('ofrece prev/actual/next y cambia de pizarra sin un botón por pizarra', async () => {
    mockTwoBoards();
    const { getByTestId, findByText, queryByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    expect(getByTestId('board-selector')).toBeTruthy();
    expect(getByTestId('board-selector-prev')).toBeTruthy();
    expect(getByTestId('board-selector-current')).toBeTruthy();
    expect(getByTestId('board-selector-next')).toBeTruthy();
    // El nombre vive en el selector actual
    expect(within(getByTestId('board-selector')).getByText('Sprint')).toBeTruthy();
    fireEvent.press(getByTestId('board-selector-next'));
    expect(await findByText('Otra tarea')).toBeTruthy();
    expect(queryByText('Primera tarea')).toBeNull();
  });

  it('mantiene la pizarra seleccionada centrada y muestra la anterior y la siguiente', async () => {
    mockThreeBoards();
    const { getByTestId, findByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('board-selector-next'));
    await waitFor(() => expect(within(getByTestId('board-selector-current')).getByText('Diseño')).toBeTruthy());
    expect(getByTestId('board-selector-prev-card').props.accessibilityLabel).toBe('Pizarra Sprint');
    expect(getByTestId('board-selector-next-card').props.accessibilityLabel).toBe('Pizarra Lanzamiento');

    fireEvent.press(getByTestId('board-selector-next'));
    await waitFor(() => expect(within(getByTestId('board-selector-current')).getByText('Lanzamiento')).toBeTruthy());
    expect(getByTestId('board-selector-prev-card').props.accessibilityLabel).toBe('Pizarra Diseño');
    expect(getByTestId('board-selector-next-placeholder')).toBeTruthy();
  });
  it('los extremos del selector no cambian de pizarra', async () => {
    mockTwoBoards();
    const { getByTestId, findByText, queryByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    expect(getByTestId('board-selector-prev').props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(getByTestId('board-selector-prev'));
    expect(await findByText('Primera tarea')).toBeTruthy();
    fireEvent.press(getByTestId('board-selector-next'));
    expect(await findByText('Otra tarea')).toBeTruthy();
    expect(getByTestId('board-selector-next').props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(getByTestId('board-selector-next'));
    expect(await findByText('Otra tarea')).toBeTruthy();
    expect(queryByText('Primera tarea')).toBeNull();
  });
});

describeNative('UX sesión: cerrar sesión vive en ajustes', () => {
  it('kanban ya no muestra Salir en el header', async () => {
    mockSingleBoard();
    const { findByText, queryByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    expect(queryByText('Salir')).toBeNull();
  });

  it('ajustes ofrece Cerrar sesión y redirige a login', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(authState({ logout }));
    const { getByTestId } = render(<SettingsScreen />);
    const btn = await waitFor(() => getByTestId('settings-logout'));
    fireEvent.press(btn);
    await waitFor(() => expect(logout).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });
});

describeNative('UX estados: popup flotante con 3 puntos', () => {
  it('abre un popup anclado con renombrar/eliminar y cierra en backdrop', async () => {
    mockSingleBoard();
    const { getByTestId, findByText, queryByTestId } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c1'));
    // Popup flotante anclado a la columna, no modal centrado
    expect(getByTestId('column-menu-popover-c1')).toBeTruthy();
    expect(getByTestId('column-rename')).toBeTruthy();
    expect(getByTestId('column-delete')).toBeTruthy();
    fireEvent.press(getByTestId('column-menu-backdrop'));
    expect(queryByTestId('column-menu-popover-c1')).toBeNull();
  });
});
