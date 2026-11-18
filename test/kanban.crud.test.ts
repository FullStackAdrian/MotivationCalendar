const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

import './helpers/test-env';
import { KanbanService } from '../backend/domain/services/kanban.service';

function makeDeps({ boards = [], members = [], columns = [], tasks = [], users = [] } = {}) {
  const store = { boards, members, columns, tasks };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  return {
    userRepository: {
      async findById(userId) { return users.find((user) => user.id === userId) || null; },
    },
    boardRepository: {
      async hasAccess(boardId, userId) {
        return boards.some((board) => board.id === boardId && board.ownerId === userId)
          || members.some((member) => member.boardId === boardId && member.userId === userId);
      },
      async isOwner(boardId, userId) { return boards.some((board) => board.id === boardId && board.ownerId === userId); },
      async update(boardId, patch) {
        const board = boards.find((item) => item.id === boardId);
        if (!board) return null;
        Object.assign(board, patch);
        return clone(board);
      },
      async delete(boardId) {
        const index = boards.findIndex((item) => item.id === boardId);
        if (index < 0) return;
        boards.splice(index, 1);
      },
    },
    columnRepository: {
      async findById(columnId) { const found = columns.find((column) => column.id === columnId); return found ? clone(found) : null; },
      async findByIdInBoard(columnId, boardId) { const found = columns.find((column) => column.id === columnId && column.boardId === boardId); return found ? clone(found) : null; },
      async listByBoardOrdered(boardId) { return clone(columns.filter((column) => column.boardId === boardId).sort((a, b) => a.position - b.position)); },
      async update(columnId, patch) {
        const index = columns.findIndex((column) => column.id === columnId);
        if (index < 0) return null;
        Object.assign(columns[index], patch);
        return clone(columns[index]);
      },
      async updatePositions(positions) {
        for (const { id: columnId, position } of positions) {
          const column = columns.find((item) => item.id === columnId);
          if (column) column.position = position;
        }
      },
      async delete(columnId) {
        const index = columns.findIndex((column) => column.id === columnId);
        if (index >= 0) columns.splice(index, 1);
      },
    },
    taskRepository: {
      async findById(taskId) { const found = tasks.find((task) => task.id === taskId); return found ? clone(found) : null; },
      async countActiveInColumn(boardId, columnId) { return tasks.filter((task) => task.boardId === boardId && task.columnId === columnId && !task.archivedAt).length; },
      async update(taskId, patch) {
        const index = tasks.findIndex((task) => task.id === taskId);
        if (index < 0) return null;
        Object.assign(tasks[index], patch);
        return clone(tasks[index]);
      },
      async delete(taskId) {
        const index = tasks.findIndex((task) => task.id === taskId);
        if (index >= 0) tasks.splice(index, 1);
      },
    },
    store,
  };
}

const OWNER = 'user_owner';
const MEMBER = 'user_member';
const STRANGER = 'user_stranger';
const base = () => ({
  boards: [{ id: 'b1', name: 'Pizarra', ownerId: OWNER }],
  members: [{ boardId: 'b1', userId: MEMBER, role: 'member' }],
  columns: [
    { id: 'c1', boardId: 'b1', name: 'Todo', position: 0, isDone: false, isPaused: false },
    { id: 'c2', boardId: 'b1', name: 'Done', position: 1, isDone: true, isPaused: false },
  ],
  tasks: [{ id: 't1', boardId: 'b1', columnId: 'c1', title: 'Vieja', priority: 'medium', archivedAt: null }],
});

test('updateBoard renombra la pizarra para miembros y rechaza a extraños', async () => {
  const deps = makeDeps(base());
  const service = new KanbanService(deps);
  const updated = await service.updateBoard('b1', MEMBER, { name: '  Nueva  ' });
  assert.equal(updated.name, 'Nueva');
  await assert.rejects(service.updateBoard('b1', STRANGER, { name: 'X' }), /No autorizado/);
});

test('updateBoard rechaza nombres vacíos', async () => {
  const deps = makeDeps(base());
  const service = new KanbanService(deps);
  await assert.rejects(service.updateBoard('b1', OWNER, { name: '   ' }), /obligatorio/i);
});

test('deleteBoard solo la borra el dueño', async () => {
  const deps = makeDeps(base());
  const service = new KanbanService(deps);
  await assert.rejects(service.deleteBoard('b1', MEMBER), /dueño/i);
  await service.deleteBoard('b1', OWNER);
  assert.equal(deps.store.boards.length, 0);
});

test('deleteColumn bloquea cuando hay tareas y reordena al borrar', async () => {
  const deps = makeDeps(base());
  const service = new KanbanService(deps);
  await assert.rejects(service.deleteColumn('c1', OWNER), /tareas/i);
  await service.deleteColumn('c2', OWNER);
  assert.deepEqual(deps.store.columns.map((column) => column.id), ['c1']);
  assert.equal(deps.store.columns[0].position, 0);
});

test('updateTask cambia título y prioridad con validación', async () => {
  const deps = makeDeps(base());
  const service = new KanbanService(deps);
  const updated = await service.updateTask('t1', MEMBER, { title: '  Nueva  ', priority: 'high' });
  assert.equal(updated.title, 'Nueva');
  assert.equal(updated.priority, 'high');
  await assert.rejects(service.updateTask('t1', STRANGER, { title: 'X' }), /No autorizado/);
  await assert.rejects(service.updateTask('t1', OWNER, { title: '' }), /obligatorio/i);
  await assert.rejects(service.updateTask('t1', OWNER, { priority: 'urgent' }), /rioridad/i);
});

test('deleteTask la elimina para miembros y rechaza a extraños', async () => {
  const deps = makeDeps(base());
  const service = new KanbanService(deps);
  await assert.rejects(service.deleteTask('t1', STRANGER), /No autorizado/);
  await service.deleteTask('t1', MEMBER);
  assert.equal(deps.store.tasks.length, 0);
});
