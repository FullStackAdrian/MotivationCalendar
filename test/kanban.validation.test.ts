import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

import {
  createBoard,
  createColumn,
  createTask
} from '../backend/domain/kanban';
import { KanbanService } from '../backend/domain/services/kanban.service';
import app from '../backend/server';

test('board names are capped at the database width (120)', () => {
  assert.equal(createBoard({ name: 'A'.repeat(120), ownerId: 'u1' }).name, 'A'.repeat(120));
  assert.throws(() => createBoard({ name: 'A'.repeat(121), ownerId: 'u1' }), /120/);
});

test('column names are capped at the database width (80)', () => {
  assert.equal(createColumn({ boardId: 'b1', name: 'A'.repeat(80) }).name, 'A'.repeat(80));
  assert.throws(() => createColumn({ boardId: 'b1', name: 'A'.repeat(81) }), /80/);
});

test('task titles are capped at the database width (180)', () => {
  const base = { boardId: 'b1', columnId: 'c1' };
  assert.equal(createTask({ ...base, title: 'A'.repeat(180) }).title, 'A'.repeat(180));
  assert.throws(() => createTask({ ...base, title: 'A'.repeat(181) }), /180/);
});

test('descriptions are capped at 2000 characters', () => {
  assert.equal(
    createBoard({ name: 'B', ownerId: 'u1', description: 'D'.repeat(2000) }).description,
    'D'.repeat(2000)
  );
  assert.throws(
    () => createBoard({ name: 'B', ownerId: 'u1', description: 'D'.repeat(2001) }),
    /2000/
  );
  assert.throws(
    () => createTask({ boardId: 'b1', columnId: 'c1', title: 'T', description: 'D'.repeat(2001) }),
    /2000/
  );
});

test('markup in names is stored literally (render layer must escape it)', () => {
  const board = createBoard({ name: '<script>alert(1)</script>', ownerId: 'u1' });
  assert.equal(board.name, '<script>alert(1)</script>');
});

test('updateColumn validates the name instead of passing it through', async () => {
  const columns = [{ id: 'c1', boardId: 'b1', name: 'Todo', position: 0 }];
  const service = new KanbanService({
    userRepository: { async findById() { return null; } },
    boardRepository: {
      async hasAccess() { return true; },
      async findByIdWithDetails() { return null; },
      async listVisibleByUser() { return []; },
      async createWithDefaults() { throw new Error('not used'); },
      async isOwner() { return true; },
      async isMemberRow() { return true; },
      async addMemberIfAbsent() { return { created: false, member: null }; },
      async listMemberUsers() { return []; }
    },
    columnRepository: {
      async findById(columnId: string) { return columns.find((c) => c.id === columnId) || null; },
      async listByBoardOrdered() { return columns; },
      async countByBoard() { return columns.length; },
      async create(value: unknown) { return value; },
      async update(columnId: string, patch: Record<string, unknown>) {
        return { ...columns.find((c) => c.id === columnId), ...patch };
      },
      async updatePositions() {},
      async findByIdInBoard() { return null; },
      async findDoneByBoard() { return null; }
    },
    taskRepository: {}
  } as never);
  await assert.rejects(service.updateColumn('c1', 'u1', { name: 'A'.repeat(81) }), /80/);
  await assert.rejects(service.updateColumn('c1', 'u1', { name: '   ' }), /obligatorio/);
  const updated = await service.updateColumn('c1', 'u1', { name: 'Inbox' });
  assert.equal(updated?.name, 'Inbox');
});

test('kanban routes reject non-UUID identifiers with 400 before touching the DB', async () => {
  const token = jwt.sign({ userId: 'u1', username: 'a' }, 'test-secret');
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const cases: Array<{ path: string; method: string; body?: unknown }> = [
    { path: '/api/kanban/boards/not-a-uuid', method: 'GET' },
    { path: '/api/kanban/columns/not-a-uuid', method: 'PATCH', body: {} },
    { path: '/api/kanban/tasks/not-a-uuid/move', method: 'PATCH', body: { columnId: 'c1' } }
  ];
  try {
    for (const { path, method, body } of cases) {
      const response = await fetch(base + path, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      assert.equal(response.status, 400, path);
      assert.match(((await response.json()) as { error: string }).error, /identificador/i, path);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
