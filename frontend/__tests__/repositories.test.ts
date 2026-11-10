import axios from 'axios';
import { ApiClient } from '@/infrastructure/http/api-client';
import { CalendarRepository } from '@/infrastructure/calendar/calendar.repository';
import { KanbanRepository } from '@/infrastructure/kanban/kanban.repository';

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

const http = (): Record<'get' | 'post' | 'put' | 'patch' | 'delete', jest.Mock> =>
  (axios as unknown as { __instance: Record<'get' | 'post' | 'put' | 'patch' | 'delete', jest.Mock> }).__instance;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('infrastructure repositories (E.7/E.8: axios mockeado, sin red)', () => {
  it('calendar repository maps progress endpoints', async () => {
    http().get.mockResolvedValue({ data: { progress: {} } });
    http().put.mockResolvedValue({ data: { progress: { '2026-08-10': 'completed' } } });
    const repository = new CalendarRepository();
    await expect(repository.getProgress()).resolves.toEqual({ progress: {} });
    expect(http().get).toHaveBeenCalledWith('/api/progress', undefined);
    await expect(repository.updateDay('2026-08-10', 'completed')).resolves.toEqual({ progress: { '2026-08-10': 'completed' } });
    expect(http().put).toHaveBeenCalledWith('/api/progress/2026-08-10', { status: 'completed' }, undefined);
  });

  it('kanban repository maps board endpoints', async () => {
    http().get.mockImplementation((url: string) => Promise.resolve({ data: { url } }));
    http().post.mockImplementation((url: string, body: unknown) => Promise.resolve({ data: { url, body } }));
    http().patch.mockImplementation((url: string, body: unknown) => Promise.resolve({ data: { url, body } }));
    const repository = new KanbanRepository();
    await repository.listBoards();
    expect(http().get).toHaveBeenCalledWith('/api/kanban/boards', undefined);
    await repository.getBoard('b1');
    expect(http().get).toHaveBeenCalledWith('/api/kanban/boards/b1', undefined);
    await repository.getMembers('b1');
    expect(http().get).toHaveBeenCalledWith('/api/kanban/boards/b1/members', undefined);
    await repository.createBoard({ name: 'N' });
    expect(http().post).toHaveBeenCalledWith('/api/kanban/boards', { name: 'N' }, undefined);
    await repository.createColumn('b1', { name: 'C' });
    expect(http().post).toHaveBeenCalledWith('/api/kanban/boards/b1/columns', { name: 'C' }, undefined);
    await repository.createTask('b1', { title: 'T' });
    expect(http().post).toHaveBeenCalledWith('/api/kanban/boards/b1/tasks', { title: 'T' }, undefined);
    await repository.moveTask('t1', 'c2');
    expect(http().patch).toHaveBeenCalledWith('/api/kanban/tasks/t1/move', { columnId: 'c2' }, undefined);
    await repository.moveTask('t1', 'c2', '2026-08-10');
    expect(http().patch).toHaveBeenCalledWith('/api/kanban/tasks/t1/move', { columnId: 'c2', date: '2026-08-10' }, undefined);
    await repository.archive('b1');
    expect(http().get).toHaveBeenCalledWith('/api/kanban/boards/b1/archive', undefined);
  });

  it('api client exposes every HTTP verb', async () => {
    const client = new ApiClient('https://api.example.com', { get: jest.fn(), set: jest.fn(), clear: jest.fn() } as never);
    http().get.mockResolvedValue({ data: 1 });
    http().put.mockResolvedValue({ data: 2 });
    http().patch.mockResolvedValue({ data: 3 });
    http().delete.mockResolvedValue({ data: 4 });
    await expect(client.get('/a')).resolves.toBe(1);
    await expect(client.put('/b', {})).resolves.toBe(2);
    await expect(client.patch('/c', {})).resolves.toBe(3);
    await expect(client.delete('/d')).resolves.toBe(4);
  });
});
