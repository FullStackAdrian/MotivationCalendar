import '../helpers/test-env';
import type { AddressInfo } from 'node:net';
import { once } from 'node:events';
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

import app from '../../backend/server';
import { initializeDatabase, closeDatabase, sequelize } from '../../backend/infrastructure/models/database';

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

const tag = `routerr_${Date.now()}`;
let ownerToken = '';
let strangerToken = '';
let boardId = '';
let columnId = '';

test.before(async () => {
  await initializeDatabase();
  await sequelize.sync();
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const owner = await request('/api/auth/register', json('POST', { username: `${tag}_owner`, email: `${tag}_owner@example.com`, password: 'password123' }));
  ownerToken = owner.body.token;
  const stranger = await request('/api/auth/register', json('POST', { username: `${tag}_stranger`, email: `${tag}_stranger@example.com`, password: 'password123' }));
  strangerToken = stranger.body.token;
  const board = await request('/api/kanban/boards', json('POST', { name: 'Errores' }, ownerToken));
  boardId = board.body.id;
  columnId = board.body.columns[0].id;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeDatabase().catch(() => {});
});

test('adding a member as a non-owner is forbidden', async () => {
  const result = await request(`/api/kanban/boards/${boardId}/members`, json('POST', { userId: 'anyone' }, strangerToken));
  assert.equal(result.response.status, 403);
  assert.equal(result.body.error, 'No autorizado');
});

test('reading an unknown board is rejected as unauthorized', async () => {
  const result = await request('/api/kanban/boards/00000000-0000-0000-0000-000000000000', { headers: { Authorization: `Bearer ${ownerToken}` } });
  assert.equal(result.response.status, 403);
  assert.equal(result.body.error, 'No autorizado');
});

test('reordering with a non-numeric position maps to a 400 business error', async () => {
  const result = await request(
    `/api/kanban/boards/${boardId}/columns/${columnId}/position`,
    json('PATCH', { position: 'abc' }, ownerToken)
  );
  assert.equal(result.response.status, 400);
  assert.match(result.body.error, /posición/i);
});

test('moving an unknown occurrence maps to a 400 business error', async () => {
  const created = await request(
    `/api/kanban/boards/${boardId}/tasks`,
    json('POST', { title: 'Semanal', columnId, recurrence: { type: 'weekly', days: [1, 2, 3, 4, 5, 6, 7] } }, ownerToken)
  );
  assert.equal(created.response.status, 201);
  const result = await request(
    `/api/kanban/tasks/${created.body.id}/move`,
    json('PATCH', { columnId, date: '2099-01-01' }, ownerToken)
  );
  assert.equal(result.response.status, 400);
  assert.match(result.body.error, /Ocurrencia no encontrada/);
});

test('unexpected failures fall through to the 500 handler', async () => {
  await closeDatabase();
  const result = await request('/api/kanban/boards', { headers: { Authorization: `Bearer ${ownerToken}` } });
  assert.equal(result.response.status, 500);
});
