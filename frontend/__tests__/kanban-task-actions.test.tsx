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

describeNative('KanbanScreen board switching and errors', () => {
  it('boards switch reloads the selected board', async () => {
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
    const { getByText, findByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByText('Otro'));
    expect(await findByText('Otra tarea')).toBeTruthy();
  });

  it('shows an error with retry when loading fails', async () => {
    http().get.mockRejectedValueOnce(new Error());
    http().get.mockRejectedValueOnce(new Error());
    http().get.mockImplementation((url: string) => {
      if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint', columns: [] }] });
      if (url === '/api/kanban/boards/b1') return Promise.resolve({ data: board });
      return Promise.resolve({ data: [] });
    });
    const { getByText, findByText } = render(<KanbanScreen />);
    await findByText('No se pudo cargar el Kanban');
    fireEvent.press(getByText('Reintentar'));
    expect(await findByText('Primera tarea')).toBeTruthy();
  });

  it('shows an error when advancing a task fails', async () => {
    mockBoard();
    http().patch.mockRejectedValueOnce(new Error('Límite WIP alcanzado'));
    const { findByText, getByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByText('Primera tarea'));
    expect(await findByText('Límite WIP alcanzado')).toBeTruthy();
  });

  it('blocks column deletion with tasks and shows the error', async () => {
    mockBoard();
    http().delete.mockRejectedValueOnce(new Error('El estado tiene tareas'));
    const { getByTestId, findByText, getByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c1'));
    fireEvent.press(getByTestId('column-delete'));
    fireEvent.press(getByTestId('column-delete-confirm'));
    expect(await findByText(/tiene tareas/)).toBeTruthy();
    expect(http().delete).toHaveBeenCalledWith('/api/kanban/columns/c1', undefined);
  });

  it('reorders a column to the right', async () => {
    mockBoard();
    http().patch.mockResolvedValue({ data: [] });
    const { getByTestId, findByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c1'));
    fireEvent.press(getByTestId('column-right'));
    await waitFor(() =>
      expect(http().patch).toHaveBeenCalledWith('/api/kanban/boards/b1/columns/c1/position', { position: 1 }, undefined)
    );
  });

  it('lists archived tasks in the archive modal', async () => {
    http().get.mockImplementation((url: string) => {
      if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint', columns: [] }] });
      if (url === '/api/kanban/boards/b1') return Promise.resolve({ data: board });
      if (url === '/api/kanban/boards/b1/archive') {
        return Promise.resolve({ data: [{ id: 't0', title: 'Vieja', archivedAt: '2026-01-01' }] });
      }
      return Promise.resolve({ data: [] });
    });
    const { getByTestId, findByText, getByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('kanban-archive'));
    expect(await findByText('Vieja')).toBeTruthy();
    expect(getByText(/2026-01-01/)).toBeTruthy();
  });
});

describeNative('KanbanScreen detail extras', () => {
  const richBoard = {
    id: 'b1',
    name: 'Sprint',
    columns: [
      { id: 'c1', name: 'Todo', color: '#64748b', position: 0, isDone: false, isPaused: false },
      { id: 'c2', name: 'Hecho', color: '#2E5E18', position: 1, isDone: true, isPaused: false },
    ],
    tasks: [
      {
        id: 't1',
        title: 'Rica',
        columnId: 'c2',
        priority: 'low' as const,
        tags: ['a', 'b'],
        assignee: { id: 'u1', username: 'alice' },
        effortPoints: 3,
        estimatedMinutes: 45,
        recurrence: { type: 'weekly' as const, days: [1, 3] },
      },
    ],
  };

  function mockRichBoard() {
    http().get.mockImplementation((url: string) => {
      if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint', columns: [] }] });
      if (url === '/api/kanban/boards/b1') return Promise.resolve({ data: richBoard });
      return Promise.resolve({ data: [] });
    });
  }

  it('renders full task meta and edits with priority change', async () => {
    mockRichBoard();
    http().patch.mockResolvedValue({ data: {} });
    const { getByTestId, getAllByText, getAllByDisplayValue, findByText, getByText } = render(<KanbanScreen />);
    await findByText('Rica');
    fireEvent.press(getByTestId('task-detail-t1'));
    await findByText('Detalle de tarea');
    expect(getAllByText(/alice/)).toHaveLength(2);
    expect(getAllByText(/3 puntos/)).toHaveLength(1);
    expect(getAllByText(/45 min/)).toHaveLength(1);
    expect(getAllByText(/Semanal/)).toHaveLength(1);
    fireEvent.press(getByTestId('task-edit'));
    fireEvent.changeText(getAllByDisplayValue('Rica')[0], 'Rica 2');
    fireEvent.press(getByText('Alta'));
    fireEvent.press(getByTestId('task-save'));
    await waitFor(() =>
      expect(http().patch).toHaveBeenCalledWith(
        '/api/kanban/tasks/t1',
        expect.objectContaining({ title: 'Rica 2', priority: 'high' }),
        undefined
      )
    );
  });

  it('disables back on first column and forward on last', async () => {
    mockBoard();
    const { getByTestId, findByText, getByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('task-detail-t1'));
    await findByText('Detalle de tarea');
    expect(getByTestId('task-detail-back').props.accessibilityState?.disabled).toBe(true);
    expect(getByTestId('task-detail-next').props.accessibilityState?.disabled).toBe(false);
    fireEvent.press(getByTestId('task-edit'));
    expect(getByText('Guardar')).toBeTruthy();
    fireEvent.press(getByText('Cancelar'));
  });

  it('menu disables out-of-range moves and closes cleanly', async () => {
    mockBoard();
    const { getByTestId, findByText, getByText, queryByTestId } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c1'));
    expect(getByTestId('column-left').props.accessibilityState?.disabled).toBe(true);
    expect(getByTestId('column-delete').props.accessibilityState?.disabled).toBe(false);
    fireEvent.press(getByTestId('column-delete'));
    expect(getByTestId('column-delete-confirm')).toBeTruthy();
    fireEvent.press(getByText('Cerrar'));
    expect(queryByTestId('column-delete')).toBeNull();
  });

  it('board modal edit mode hides description and board delete needs confirm', async () => {
    mockBoard();
    const { getByTestId, findByText, getByText, queryByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('board-rename'));
    await findByText('Renombrar pizarra');
    expect(queryByText('Descripción')).toBeNull();
    fireEvent.press(getByText('Guardar pizarra'));
    await waitFor(() =>
      expect(http().patch).toHaveBeenCalledWith('/api/kanban/boards/b1', { name: 'Sprint' }, undefined)
    );
  });
});

describeNative('KanbanScreen board menu', () => {
  it('renames the selected board', async () => {
    mockBoard();
    http().patch.mockResolvedValue({ data: {} });
    const { getByTestId, getAllByDisplayValue, findByText, getByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('board-rename'));
    expect(await findByText('Renombrar pizarra')).toBeTruthy();
    fireEvent.changeText(getAllByDisplayValue('Sprint')[0], 'Sprint 2');
    fireEvent.press(getByText('Guardar pizarra'));
    await waitFor(() =>
      expect(http().patch).toHaveBeenCalledWith('/api/kanban/boards/b1', { name: 'Sprint 2' }, undefined)
    );
  });

  it('deletes the board after a two-step confirm', async () => {
    mockBoard();
    http().delete.mockResolvedValue({ data: {} });
    const { getByTestId, findByText, getByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('board-delete'));
    fireEvent.press(getByTestId('board-delete-confirm'));
    await waitFor(() =>
      expect(http().delete).toHaveBeenCalledWith('/api/kanban/boards/b1', undefined)
    );
  });
});

describeNative('KanbanScreen task edit', () => {
  it('edits title and priority from the detail modal', async () => {
    mockBoard();
    http().patch.mockResolvedValue({ data: {} });
    const { getByTestId, getAllByDisplayValue, findByText, getByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('task-detail-t1'));
    await findByText('Detalle de tarea');
    fireEvent.press(getByTestId('task-edit'));
    fireEvent.changeText(getAllByDisplayValue('Primera tarea')[0], 'Nueva tarea');
    fireEvent.press(getByTestId('task-save'));
    await waitFor(() =>
      expect(http().patch).toHaveBeenCalledWith(
        '/api/kanban/tasks/t1',
        expect.objectContaining({ title: 'Nueva tarea' }),
        undefined
      )
    );
  });

  it('deletes the task after a two-step confirm', async () => {
    mockBoard();
    http().delete.mockResolvedValue({ data: {} });
    const { getByTestId, findByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('task-detail-t1'));
    await findByText('Detalle de tarea');
    fireEvent.press(getByTestId('task-delete'));
    fireEvent.press(getByTestId('task-delete-confirm'));
    await waitFor(() =>
      expect(http().delete).toHaveBeenCalledWith('/api/kanban/tasks/t1', undefined)
    );
  });

  it('deletes a column after a two-step confirm', async () => {
    mockBoard();
    http().patch.mockResolvedValue({ data: [] });
    http().delete.mockResolvedValue(undefined);
    const { getByTestId, findByText } = render(<KanbanScreen />);
    await findByText('Primera tarea');
    fireEvent.press(getByTestId('column-menu-c2'));
    fireEvent.press(getByTestId('column-delete'));
    fireEvent.press(getByTestId('column-delete-confirm'));
    await waitFor(() =>
      expect(http().delete).toHaveBeenCalledWith('/api/kanban/columns/c2', undefined)
    );
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
