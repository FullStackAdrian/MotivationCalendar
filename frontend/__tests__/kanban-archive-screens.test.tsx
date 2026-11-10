import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import { useAuth } from '../src/contexts/auth-context';
import { describeNative } from './helpers/projects';
import KanbanScreen from '../src/screens/kanban-screen';
import ArchiveScreen from '../src/screens/archive-screen';

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
const http = (): { get: jest.Mock; post: jest.Mock; patch: jest.Mock } =>
  (axios as unknown as { __instance: { get: jest.Mock; post: jest.Mock; patch: jest.Mock } }).__instance;

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
});

describeNative('KanbanScreen', () => {
  it('offers board creation when there are no boards', async () => {
    http().get.mockResolvedValue({ data: [] });
    const { getByText, findByText } = render(<KanbanScreen />);
    await findByText('Organiza el trabajo sin perder de vista el día.');
    expect(getByText('Nueva pizarra')).toBeTruthy();
  });

  it('creates a board from the modal', async () => {
    http().get.mockResolvedValue({ data: [] });
    http().post.mockResolvedValue({ data: { id: 'b1', name: 'Sprint', columns: [] } });
    const { getByText, getAllByDisplayValue, findByText } = render(<KanbanScreen />);
    await findByText('Organiza el trabajo sin perder de vista el día.');
    fireEvent.press(getByText('Nueva pizarra'));
    fireEvent.changeText(getAllByDisplayValue('')[0], 'Sprint');
    fireEvent.press(getByText('Crear pizarra'));
    await waitFor(() => expect(http().post).toHaveBeenCalledWith('/api/kanban/boards', { name: 'Sprint', description: undefined }, undefined));
  });

  it('creates a task from the modal with column preselected', async () => {
    const board = {
      id: 'b1',
      name: 'Sprint',
      columns: [{ id: 'c1', name: 'Todo', color: '#fff', position: 0, isDone: false, isPaused: false }],
      tasks: [],
    };
    http().get.mockImplementation((url: string) => {
      if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint', columns: [] }] });
      if (url === '/api/kanban/boards/b1') return Promise.resolve({ data: board });
      return Promise.resolve({ data: [] });
    });
    http().post.mockResolvedValue({ data: { id: 't1' } });
    const { getByText, getAllByDisplayValue, findByText } = render(<KanbanScreen />);
    await findByText('Sin tareas');
    fireEvent.press(getByText('Nueva tarea'));
    fireEvent.changeText(getAllByDisplayValue('')[0], 'Primera tarea');
    fireEvent.press(getByText('Crear tarea'));
    await waitFor(() =>
      expect(http().post).toHaveBeenCalledWith(
        '/api/kanban/boards/b1/tasks',
        expect.objectContaining({ title: 'Primera tarea', columnId: 'c1' }),
        undefined
      )
    );
  });

  it('logs out back to login', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(authState({ logout }));
    http().get.mockResolvedValue({ data: [] });
    const { getByText, findByText } = render(<KanbanScreen />);
    await findByText('Organiza el trabajo sin perder de vista el día.');
    fireEvent.press(getByText('Salir'));
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it('shows loading errors', async () => {
    http().get.mockRejectedValue(new Error('sin conexión'));
    const { findByText } = render(<KanbanScreen />);
    expect(await findByText('sin conexión')).toBeTruthy();
  });

  it('moves a task to the next column when its card is pressed', async () => {
    const board = {
      id: 'b1',
      name: 'Sprint',
      columns: [
        { id: 'c1', name: 'Todo', color: '#fff', position: 0, isDone: false, isPaused: false },
        { id: 'c2', name: 'Done', color: '#fff', position: 1, isDone: true, isPaused: false },
      ],
      tasks: [{ id: 't1', title: 'Primera', columnId: 'c1', priority: 'medium' as const }],
    };
    http().get.mockImplementation((url: string) => {
      if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint', columns: [] }] });
      if (url === '/api/kanban/boards/b1') return Promise.resolve({ data: board });
      return Promise.resolve({ data: [] });
    });
    http().patch.mockResolvedValue({ data: {} });
    const { getByText, findByText } = render(<KanbanScreen />);
    await findByText('Primera');
    fireEvent.press(getByText('Primera'));
    await waitFor(() => expect(http().patch).toHaveBeenCalledWith('/api/kanban/tasks/t1/move', { columnId: 'c2' }, undefined));
  });

  it('creates a column from the modal with defaults', async () => {
    const board = {
      id: 'b1',
      name: 'Sprint',
      columns: [{ id: 'c1', name: 'Todo', color: '#fff', position: 0, isDone: false, isPaused: false }],
      tasks: [],
    };
    http().get.mockImplementation((url: string) => {
      if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint', columns: [] }] });
      if (url === '/api/kanban/boards/b1') return Promise.resolve({ data: board });
      return Promise.resolve({ data: [] });
    });
    http().post.mockResolvedValue({ data: { id: 'c2' } });
    const { getByText, getAllByDisplayValue, findByText } = render(<KanbanScreen />);
    await findByText('Sin tareas');
    fireEvent.press(getByText('Nuevo estado'));
    fireEvent.changeText(getAllByDisplayValue('')[0], 'Revisión');
    fireEvent.press(getByText('Crear estado'));
    await waitFor(() =>
      expect(http().post).toHaveBeenCalledWith(
        '/api/kanban/boards/b1/columns',
        { name: 'Revisión', color: '#64748b', isDone: false, isPaused: false, wipLimit: undefined },
        undefined
      )
    );
  });
});

describeNative('ArchiveScreen', () => {
  it('shows the empty state when nothing is archived', async () => {
    http().get.mockImplementation((url: string) => {
      if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint', columns: [] }] });
      return Promise.resolve({ data: [] });
    });
    const { findByText } = render(<ArchiveScreen />);
    expect(await findByText('No hay tareas archivadas.')).toBeTruthy();
  });

  it('lists archived tasks with their dates', async () => {
    http().get.mockImplementation((url: string) => {
      if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint', columns: [] }] });
      return Promise.resolve({ data: [{ id: 't1', title: 'Vieja tarea', archivedAt: '2026-08-01' }] });
    });
    const { findByText } = render(<ArchiveScreen />);
    expect(await findByText('Vieja tarea')).toBeTruthy();
    expect(await findByText(' 2026-08-01')).toBeTruthy();
  });

  it('tolerates backend failures with empty lists', async () => {
    http().get.mockRejectedValue(new Error('caído'));
    const { findByText } = render(<ArchiveScreen />);
    expect(await findByText('No hay tareas archivadas.')).toBeTruthy();
  });

  it('switches boards through the picker', async () => {
    const calls: string[] = [];
    http().get.mockImplementation((url: string) => {
      calls.push(url);
      if (url === '/api/kanban/boards') {
        return Promise.resolve({ data: [{ id: 'b1', name: 'Uno' }, { id: 'b2', name: 'Dos' }] });
      }
      return Promise.resolve({ data: [] });
    });
    const { getByText, findByText } = render(<ArchiveScreen />);
    await findByText('No hay tareas archivadas.');
    fireEvent.press(getByText('Dos'));
    await waitFor(() => expect(calls).toContain('/api/kanban/boards/b2/archive'));
  });
});
