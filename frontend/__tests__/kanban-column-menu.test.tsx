import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import { useAuth } from '../src/contexts/auth-context';
import { describeNative } from './helpers/projects';
import KanbanScreen from '../src/screens/kanban-screen';

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

function mockBoard() {
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

describeNative('ColumnMenu botones de estado', () => {
  it('abre el popup con las 5 acciones', async () => {
    mockBoard();
    const { getByTestId, getByText, findByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c1'));
    expect(getByTestId('column-menu-popover-c1')).toBeTruthy();
    expect(getByTestId('column-rename')).toBeTruthy();
    expect(getByTestId('column-left')).toBeTruthy();
    expect(getByTestId('column-right')).toBeTruthy();
    expect(getByTestId('column-delete')).toBeTruthy();
    expect(getByText('Cerrar')).toBeTruthy();
  });

  it('renombra el estado de principio a fin', async () => {
    mockBoard();
    http().patch.mockResolvedValue({ data: {} });
    const { getByTestId, getAllByDisplayValue, findByText, queryByTestId, queryByText, getByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c1'));
    fireEvent.press(getByTestId('column-rename'));
    expect(await findByText('Renombrar estado')).toBeTruthy();
    fireEvent.changeText(getAllByDisplayValue('Todo')[0], 'Por hacer');
    fireEvent.press(getByText('Guardar estado'));
    await waitFor(() =>
      expect(http().patch).toHaveBeenCalledWith('/api/kanban/columns/c1', { name: 'Por hacer' }, undefined)
    );
    expect(queryByText('Renombrar estado')).toBeNull();
    expect(queryByTestId('column-menu-popover-c1')).toBeNull();
  });

  it('mover a la derecha ejecuta el reorder y cierra el menú', async () => {
    mockBoard();
    http().patch.mockResolvedValue({ data: [] });
    const { getByTestId, findByText, queryByTestId } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c1'));
    fireEvent.press(getByTestId('column-right'));
    await waitFor(() =>
      expect(http().patch).toHaveBeenCalledWith('/api/kanban/boards/b1/columns/c1/position', { position: 1 }, undefined)
    );
    await findByText('Primera tarea');
    expect(queryByTestId('column-menu-popover-c1')).toBeNull();
  });

  it('mover a la izquierda ejecuta el reorder y cierra el menú', async () => {
    mockBoard();
    http().patch.mockResolvedValue({ data: [] });
    const { getByTestId, findByText, queryByTestId } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c2'));
    fireEvent.press(getByTestId('column-left'));
    await waitFor(() =>
      expect(http().patch).toHaveBeenCalledWith('/api/kanban/boards/b1/columns/c2/position', { position: 0 }, undefined)
    );
    await findByText('Primera tarea');
    expect(queryByTestId('column-menu-popover-c2')).toBeNull();
  });

  it('si el movimiento falla muestra el error y mantiene el menú abierto', async () => {
    mockBoard();
    http().patch.mockRejectedValueOnce(new Error('No se pudo mover'));
    const { getByTestId, findByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c1'));
    fireEvent.press(getByTestId('column-right'));
    expect(await findByText('No se pudo mover')).toBeTruthy();
    expect(getByTestId('column-menu-popover-c1')).toBeTruthy();
  });

  it('deshabilita mover-izquierda en la primera y mover-derecha en la última', async () => {
    mockBoard();
    const { getByTestId, findByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c1'));
    expect(getByTestId('column-left').props.accessibilityState?.disabled).toBe(true);
    expect(getByTestId('column-right').props.accessibilityState?.disabled).toBe(false);
    fireEvent.press(getByTestId('column-menu-backdrop'));
    fireEvent.press(getByTestId('column-menu-c2'));
    expect(getByTestId('column-right').props.accessibilityState?.disabled).toBe(true);
    expect(getByTestId('column-left').props.accessibilityState?.disabled).toBe(false);
  });

  it('elimina con doble confirmación y cierra el menú', async () => {
    mockBoard();
    http().delete.mockResolvedValue(undefined);
    const { getByTestId, findByText, queryByTestId } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c2'));
    fireEvent.press(getByTestId('column-delete'));
    fireEvent.press(getByTestId('column-delete-confirm'));
    await waitFor(() =>
      expect(http().delete).toHaveBeenCalledWith('/api/kanban/columns/c2', undefined)
    );
    await findByText('Primera tarea');
    expect(queryByTestId('column-menu-popover-c2')).toBeNull();
  });

  it('cambiar de menú sustituye el popup sin duplicarlo', async () => {
    mockBoard();
    const { getByTestId, findByText, queryByTestId } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c1'));
    expect(getByTestId('column-menu-popover-c1')).toBeTruthy();
    fireEvent.press(getByTestId('column-menu-c2'));
    expect(queryByTestId('column-menu-popover-c1')).toBeNull();
    expect(getByTestId('column-menu-popover-c2')).toBeTruthy();
  });

  it('Cerrar y el backdrop cierran sin efectos secundarios', async () => {
    mockBoard();
    const { getByTestId, getByText, findByText, queryByTestId } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c1'));
    fireEvent.press(getByText('Cerrar'));
    expect(queryByTestId('column-menu-popover-c1')).toBeNull();
    expect(http().patch).not.toHaveBeenCalled();
    expect(http().delete).not.toHaveBeenCalled();
    fireEvent.press(getByTestId('column-menu-c1'));
    fireEvent.press(getByTestId('column-menu-backdrop'));
    expect(queryByTestId('column-menu-popover-c1')).toBeNull();
    expect(http().patch).not.toHaveBeenCalled();
    expect(http().delete).not.toHaveBeenCalled();
  });
});
