import '../helpers/test-env';
import type { AddressInfo } from 'node:net';
import { once } from 'node:events';
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/motivation_calendar_test';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

import app from '../../backend/server';
import { initializeDatabase, closeDatabase, sequelize } from '../../backend/infrastructure/models/database';
import { TaskModel as Task } from '../../backend/infrastructure/models/kanban.database';

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

async function request(path: string, options: RequestInit = {}): Promise<{ response: Response; body: any }> {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, body };
}

function json(method: string, body?: unknown, token?: string): RequestInit {
  return { method, body: JSON.stringify(body), headers: token ? { Authorization: `Bearer ${token}` } : undefined };
}

test.before(async () => {
  await initializeDatabase();
  await sequelize.sync();
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
});

test('kanban requires authentication', async () => {
  const result = await request('/api/kanban/boards');
  assert.equal(result.response.status, 401);
});

async function registerAndGetToken(prefix: string): Promise<{ token: string; userId: string; username: string }> {
  const username = `${prefix}_${Date.now()}`;
  const registration = await request('/api/auth/register', json('POST', { username, email: `${username}@example.com`, password: 'password123' }));
  assert.equal(registration.response.status, 201);
  return { token: registration.body.token, userId: registration.body.user.id, username };
}

test('creates boards with configurable states and lists board members', async () => {
  const { token, username } = await registerAndGetToken('kanban');
  const boardResponse = await request('/api/kanban/boards', json('POST', { name: 'Trabajo', description: 'Sprint personal' }, token));
  assert.equal(boardResponse.response.status, 201);
  const board = boardResponse.body;
  assert.equal(board.columns.length, 4);
  assert.equal(board.columns.find((column: { name: string }) => column.name === 'Pausa').isPaused, true);
  assert.equal(board.columns.find((column: { name: string }) => column.name === 'Done').isDone, true);
  const members = await request(`/api/kanban/boards/${board.id}/members`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(members.response.status, 200);
  assert.equal(members.body[0].username, username);
});

test('creates tasks with assignment, tags, points, duration, schedule and weekly recurrence', async () => {
  const { token, userId } = await registerAndGetToken('task');
  const board = (await request('/api/kanban/boards', json('POST', { name: 'Features' }, token))).body;
  const todo = board.columns.find((column: { name: string }) => column.name === 'Todo');
  const taskResponse = await request(`/api/kanban/boards/${board.id}/tasks`, json('POST', {
    title: 'Implementar autenticación',
    columnId: todo.id,
    assigneeId: userId,
    priority: 'high',
    effortPoints: 5,
    estimatedMinutes: 30,
    dueDate: '2026-08-10',
    dueTime: '18:30',
    tags: ['backend', 'security'],
    recurrence: { type: 'weekly', days: [1, 3, 5] }
  }, token));
  assert.equal(taskResponse.response.status, 201);
  assert.equal(taskResponse.body.effortPoints, 5);
  assert.equal(taskResponse.body.estimatedMinutes, 30);
  assert.equal(taskResponse.body.dueTime, '18:30:00');
  assert.deepEqual(taskResponse.body.tags, ['backend', 'security']);
});

test('completes a recurring task and schedules the next occurrence', async () => {
  const { token } = await registerAndGetToken('repeat');
  const board = (await request('/api/kanban/boards', json('POST', { name: 'Hábitos' }, token))).body;
  const todo = board.columns.find((column: { name: string }) => column.name === 'Todo');
  const task = (await request(`/api/kanban/boards/${board.id}/tasks`, json('POST', { title: 'Entrenar', columnId: todo.id, recurrence: { type: 'weekly', days: [1, 3, 5] } }, token))).body;
  const completed = await request(`/api/kanban/tasks/${task.id}/complete`, json('POST', { date: '2026-08-10' }, token));
  assert.equal(completed.response.status, 200);
  const refreshed = await request(`/api/kanban/boards/${board.id}`, { headers: { Authorization: `Bearer ${token}` } });
  const occurrence = refreshed.body.tasks[0].occurrences.find((item: { date: string }) => item.date === '2026-08-12');
  assert.ok(occurrence);
  assert.equal(occurrence.status, 'todo');
  assert.equal(occurrence.columnId, todo.id);
});

test('archives a completed non-recurring task after the day changes', async () => {
  const { token } = await registerAndGetToken('archive');
  const board = (await request('/api/kanban/boards', json('POST', { name: 'Archivo' }, token))).body;
  const todo = board.columns.find((column: { name: string }) => column.name === 'Todo');
  const done = board.columns.find((column: { isDone: boolean }) => column.isDone);
  const task = (await request(`/api/kanban/boards/${board.id}/tasks`, json('POST', { title: 'Cerrar incidencia', columnId: todo.id }, token))).body;
  await request(`/api/kanban/tasks/${task.id}/move`, json('PATCH', { columnId: done.id }, token));
  await Task.update({ completedAt: new Date('2026-08-10T20:00:00Z') }, { where: { id: task.id } });
  const archived = await request(`/api/kanban/boards/${board.id}?today=2026-08-11`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(archived.response.status, 200);
  assert.equal(archived.body.tasks.length, 0);
  const archiveView = await request(`/api/kanban/boards/${board.id}/archive`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(archiveView.response.status, 200);
  assert.equal(archiveView.body[0].id, task.id);
});

test('reorders states and enforces board membership', async () => {
  const username = `order_${Date.now()}`;
  const { token } = await registerAndGetToken('order');
  const board = (await request('/api/kanban/boards', json('POST', { name: 'Orden' }, token))).body;
  const custom = await request(`/api/kanban/boards/${board.id}/columns`, json('POST', { name: 'Review', color: '#111111', position: 4, isPaused: false }, token));
  assert.equal(custom.response.status, 201);
  const reordered = await request(`/api/kanban/boards/${board.id}/columns/${custom.body.id}/position`, json('PATCH', { position: 0 }, token));
  assert.equal(reordered.response.status, 200);
  assert.equal(reordered.body[0].id, custom.body.id);
  const other = await request('/api/auth/register', json('POST', { username: `${username}_other`, email: `${username}_other@example.com`, password: 'password123' }));
  const denied = await request(`/api/kanban/boards/${board.id}`, { headers: { Authorization: `Bearer ${other.body.token}` } });
  assert.equal(denied.response.status, 403);
});
