import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import { useAuth } from '../src/contexts/auth-context';
import { describeNative } from './helpers/projects';
import KanbanScreen from '../src/screens/kanban-screen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
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
const http = (): { get: jest.Mock; post: jest.Mock; patch: jest.Mock } =>
  (axios as unknown as { __instance: { get: jest.Mock; post: jest.Mock; patch: jest.Mock } }).__instance;

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
  tasks: [
    { id: 't1', title: 'Primera tarea', columnId: 'c1', priority: 'high' as const, tags: [] },
  ],
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

describeNative('KanbanScreen task detail', () => {
  it('opens the detail modal from the card button without advancing the task', async () => {
    mockBoard();
    const { getByTestId, getAllByText, queryByText, findByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('task-detail-t1'));
    expect(await findByText('Detalle de tarea')).toBeTruthy();
    expect(getAllByText('Primera tarea')).toHaveLength(2);
    expect(http().patch).not.toHaveBeenCalled();
  });

  it('advances the task from the detail modal', async () => {
    mockBoard();
    http().patch.mockResolvedValue({ data: {} });
    const { getByTestId, findByText, getByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('task-detail-t1'));
    await findByText('Detalle de tarea');
    fireEvent.press(getByText('Siguiente'));
    await waitFor(() =>
      expect(http().patch).toHaveBeenCalledWith('/api/kanban/tasks/t1/move', { columnId: 'c2' }, undefined)
    );
  });

  it('moves the task back from the detail modal', async () => {
    const backBoard = { ...board, tasks: [{ ...board.tasks[0], columnId: 'c2' }] };
    http().get.mockImplementation((url: string) => {
      if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint', columns: [] }] });
      if (url === '/api/kanban/boards/b1') return Promise.resolve({ data: backBoard });
      return Promise.resolve({ data: [] });
    });
    http().patch.mockResolvedValue({ data: {} });
    const { getByTestId, findByText, getByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('task-detail-t1'));
    await findByText('Detalle de tarea');
    fireEvent.press(getByText('Anterior'));
    await waitFor(() =>
      expect(http().patch).toHaveBeenCalledWith('/api/kanban/tasks/t1/move', { columnId: 'c1' }, undefined)
    );
  });

  it('completes the task from the detail modal', async () => {
    mockBoard();
    http().post.mockResolvedValue({ data: {} });
    const { getByTestId, findByText, getByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('task-detail-t1'));
    await findByText('Detalle de tarea');
    fireEvent.press(getByText('Completar'));
    await waitFor(() =>
      expect(http().post).toHaveBeenCalledWith('/api/kanban/tasks/t1/complete', {}, undefined)
    );
  });

  it('disables detail actions while one is in flight', async () => {
    mockBoard();
    let resolveMove!: (value: unknown) => void;
    http().patch.mockImplementation(() => new Promise((resolve) => { resolveMove = resolve; }));
    const { getByTestId, findByText, getByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('task-detail-t1'));
    await findByText('Detalle de tarea');
    fireEvent.press(getByText('Siguiente'));
    await waitFor(() => expect(getByTestId('task-detail-next').props.accessibilityState?.disabled).toBe(true));
    resolveMove({ data: {} });
  });
});

describeNative('KanbanScreen column menu', () => {
  it('renames a column from its menu', async () => {
    mockBoard();
    http().patch.mockResolvedValue({ data: {} });
    const { getByTestId, getAllByDisplayValue, findByText, getByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c1'));
    fireEvent.press(getByTestId('column-rename'));
    expect(await findByText('Renombrar estado')).toBeTruthy();
    fireEvent.changeText(getAllByDisplayValue('Todo')[0], 'Por hacer');
    fireEvent.press(getByText('Guardar estado'));
    await waitFor(() =>
      expect(http().patch).toHaveBeenCalledWith('/api/kanban/columns/c1', { name: 'Por hacer' }, undefined)
    );
  });

  it('reorders a column from its menu', async () => {
    mockBoard();
    http().patch.mockResolvedValue({ data: [] });
    const { getByTestId, findByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c2'));
    fireEvent.press(getByTestId('column-left'));
    await waitFor(() =>
      expect(http().patch).toHaveBeenCalledWith('/api/kanban/boards/b1/columns/c2/position', { position: 0 }, undefined)
    );
  });
});
