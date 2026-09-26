const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

import './helpers/test-env';
import { KanbanService } from '../backend/domain/services/kanban.service';

/**
 * Fakes in-memory de los puertos definidos en domain/repositories.
 * Reproducen la semántica mínima que el servicio asume (objetos planos).
 */
interface FakeTask extends Record<string, unknown> {
  id: string;
  boardId: string;
  columnId: string;
  recurrence: { type: string; days?: number[] };
  completedAt?: string | Date | null;
  archivedAt?: string | null;
  assigneeId?: string | null;
}

function makeDeps({ boards = [], members = [], columns = [], tasks = [], occurrences = [], users = [] }: {
  boards?: Array<Record<string, unknown>>;
  members?: Array<Record<string, unknown> & { boardId: string; userId: string; username?: string }>;
  columns?: Array<Record<string, unknown>>;
  tasks?: FakeTask[];
  occurrences?: Array<Record<string, unknown>>;
  users?: Array<Record<string, unknown>>;
} = {}) {
  const store = { boards, members, columns, tasks, occurrences };
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
  let seq = 0;
  const id = prefix => `${prefix}_${++seq}`;

  return {
    userRepository: {
      async findById(userId) { return users.find(user => user.id === userId) || null; }
    },
    boardRepository: {
      async findByIdWithDetails(boardId) { return clone(boards.find(board => board.id === boardId)) || null; },
      async listVisibleByUser() { return []; },
      async createWithDefaults(boardData, ownerId, defaultColumns) {
        const board = { id: 'b_new', ...boardData };
        boards.push(board);
        defaultColumns.forEach((column, position) => columns.push({ id: id('col'), boardId: board.id, ...column, position }));
        members.push({ boardId: board.id, userId: ownerId, role: 'owner' });
        return clone(board);
      },
      async isOwner(boardId, userId) { return boards.some(board => board.id === boardId && board.ownerId === userId); },
      async hasAccess(boardId, userId) {
        return this.isOwner(boardId, userId) || members.some(member => member.boardId === boardId && member.userId === userId);
      },
      async isMemberRow(boardId, userId) { return members.some(member => member.boardId === boardId && member.userId === userId); },
      async addMemberIfAbsent(boardId, userId, role) {
        if (members.some(member => member.boardId === boardId && member.userId === userId)) return { created: false, member: null };
        const member = { boardId, userId, role };
        members.push(member);
        return { created: true, member };
      },
      async listMemberUsers(boardId) {
        return members.filter(member => member.boardId === boardId).map(member => ({ id: member.userId, username: member.username || `u_${member.userId}`, email: `${member.userId}@x.com` }));
      }
    },
    columnRepository: {
      async findById(columnId) { const found = columns.find(column => column.id === columnId); return found ? clone(found) : null; },
      async findByIdInBoard(columnId, boardId) { const found = columns.find(column => column.id === columnId && column.boardId === boardId); return found ? clone(found) : null; },
      async listByBoardOrdered(boardId) { return clone(columns.filter(column => column.boardId === boardId).sort((a, b) => a.position - b.position)); },
      async countByBoard(boardId) { return columns.filter(column => column.boardId === boardId).length; },
      async findDoneByBoard(boardId) { const done = columns.filter(column => column.boardId === boardId && column.isDone).pop(); return done ? clone(done) : null; },
      async create(data) { const column = { id: id('col'), ...data }; columns.push(column); return clone(column); },
      async update(columnId, patch) {
        const index = columns.findIndex(column => column.id === columnId);
        if (index < 0) return null;
        Object.assign(columns[index], patch);
        return clone(columns[index]);
      },
      async updatePositions(positions) {
        for (const { id: columnId, position } of positions) {
          const column = columns.find(item => item.id === columnId);
          if (column) column.position = position;
        }
      }
    },
    taskRepository: {
      async findById(taskId) { const found = tasks.find(task => task.id === taskId); return found ? clone(found) : null; },
      async listActiveByBoard(boardId) { return clone(tasks.filter(task => task.boardId === boardId && !task.archivedAt)); },
      async listArchived(boardId, filters = {}) { return clone(tasks.filter(task => task.boardId === boardId && task.archivedAt && (!filters.assigneeId || task.assigneeId === filters.assigneeId))); },
      async countActiveInColumn(boardId, columnId) { return tasks.filter(task => task.boardId === boardId && task.columnId === columnId && !task.archivedAt).length; },
      async create(data) { const task = { id: id('task'), recurrence: { type: 'none', days: [] }, completedAt: null, archivedAt: null, ...data }; tasks.push(task); return clone(task); },
      async update(taskId, patch) {
        const index = tasks.findIndex(task => task.id === taskId);
        if (index < 0) return null;
        Object.assign(tasks[index], patch);
        return clone(tasks[index]);
      },
      async findOccurrenceByTaskAndDate(taskId, date) { const found = occurrences.find(o => o.taskId === taskId && o.date === date); return found ? clone(found) : null; },
      async findFirstTodoOccurrence(taskId) {
        const found = occurrences.filter(o => o.taskId === taskId && o.status === 'todo').sort((a, b) => a.date.localeCompare(b.date))[0];
        return found ? clone(found) : null;
      },
      async createOccurrence(data) { const occurrence = { id: id('occ'), ...data }; occurrences.push(occurrence); return clone(occurrence); },
      async findOrCreateNextOccurrence(taskId, date, defaults) {
        const existing = occurrences.find(o => o.taskId === taskId && o.date === date);
        if (existing) return clone(existing);
        const created = { id: id('occ'), taskId, date, ...defaults };
        occurrences.push(created);
        return clone(created);
      },
      async updateOccurrence(occurrenceId, patch) {
        const index = occurrences.findIndex(o => o.id === occurrenceId);
        if (index < 0) return null;
        Object.assign(occurrences[index], patch);
        return clone(occurrences[index]);
      }
    },
    store
  };
}

const OWNER = 'user_owner';
const STRANGER = 'user_stranger';
const baseBoard = () => [{ id: 'b1', name: 'Pizarra', ownerId: OWNER }];
const baseColumns = () => [
  { id: 'c1', boardId: 'b1', name: 'Todo', position: 0, wipLimit: null, isDone: false, isPaused: false },
  { id: 'c2', boardId: 'b1', name: 'WIP', position: 1, wipLimit: 1, isDone: false, isPaused: false },
  { id: 'c3', boardId: 'b1', name: 'Done', position: 2, wipLimit: null, isDone: true, isPaused: false }
];

test('createBoard persists the board with default business columns and returns details', async () => {
  const deps = makeDeps({ boards: [] });
  deps.boardRepository.findByIdWithDetails = async () => ({ id: 'b_new', name: 'Nueva', columns: [{}, {}, {}, {}], tasks: [] });
  const service = new KanbanService(deps);
  const result = await service.createBoard(OWNER, { name: 'Nueva' });
  assert.equal(result.columns.length, 4);
  assert.deepEqual(deps.store.columns.map(column => column.name), ['Todo', 'En progreso', 'Pausa', 'Done']);
});

test('createTask rejects an assignee who is not a board member', async () => {
  const deps = makeDeps({ boards: baseBoard(), members: [{ boardId: 'b1', userId: OWNER }], columns: baseColumns() });
  const service = new KanbanService(deps);
  await assert.rejects(
    service.createTask('b1', OWNER, { title: 'Tarea', columnId: 'c1', assigneeId: STRANGER }),
    /El usuario asignado no pertenece a la pizarra/
  );
});

test('moveTask enforces the WIP limit of the target column', async () => {
  const deps = makeDeps({
    boards: baseBoard(),
    members: [{ boardId: 'b1', userId: OWNER }],
    columns: baseColumns(),
    tasks: [
      { id: 't1', boardId: 'b1', columnId: 'c1', recurrence: { type: 'none', days: [] }, completedAt: null },
      { id: 't2', boardId: 'b1', columnId: 'c2', recurrence: { type: 'none', days: [] }, completedAt: null }
    ]
  });
  const service = new KanbanService(deps);
  await assert.rejects(service.moveTask('t1', OWNER, 'c2'), /Límite WIP alcanzado/);
  await service.moveTask('t2', OWNER, 'c2'); // misma columna: permitido aunque esté llena
  const moved = await service.moveTask('t2', OWNER, 'c1');
  assert.equal(moved.columnId, 'c1');
});

test('moveTask sets completedAt only when the target column is Done', async () => {
  const deps = makeDeps({
    boards: baseBoard(),
    members: [{ boardId: 'b1', userId: OWNER }],
    columns: baseColumns(),
    tasks: [{ id: 't1', boardId: 'b1', columnId: 'c1', recurrence: { type: 'none', days: [] }, completedAt: null }]
  });
  const service = new KanbanService(deps);
  const toDone = await service.moveTask('t1', OWNER, 'c3');
  assert.ok(toDone.completedAt);
  await service.moveTask('t1', OWNER, 'c1');
  assert.equal(deps.store.tasks[0].completedAt, null);
});

test('moveTaskOccurrence updates weekly occurrences and delegates non-weekly to moveTask', async () => {
  const deps = makeDeps({
    boards: baseBoard(),
    members: [{ boardId: 'b1', userId: OWNER }],
    columns: baseColumns(),
    tasks: [
      { id: 'tw', boardId: 'b1', columnId: 'c1', recurrence: { type: 'weekly', days: [1] }, completedAt: null },
      { id: 'tn', boardId: 'b1', columnId: 'c1', recurrence: { type: 'none', days: [] }, completedAt: null }
    ],
    occurrences: [{ id: 'o1', taskId: 'tw', date: '2026-08-25', status: 'todo', columnId: 'c1', completedAt: null }]
  });
  const service = new KanbanService(deps);

  const moved = await service.moveTaskOccurrence('tw', OWNER, 'c3', '2026-08-25');
  assert.equal(moved.status, 'done');
  assert.equal(moved.columnId, 'c3');
  assert.ok(moved.completedAt);

  await assert.rejects(service.moveTaskOccurrence('tw', OWNER, 'c2', '2026-09-01'), /Ocurrencia no encontrada/);

  const delegated = await service.moveTaskOccurrence('tn', OWNER, 'c3', 'ignored-date');
  assert.equal(delegated.columnId, 'c3');
  assert.ok(delegated.completedAt);
});

test('listMembers guards access before listing users', async () => {
  const deps = makeDeps({
    boards: baseBoard(),
    members: [{ boardId: 'b1', userId: OWNER, username: 'owner' }]
  });
  const service = new KanbanService(deps);
  await assert.rejects(service.listMembers('b1', STRANGER), /No autorizado/);
  const members = await service.listMembers('b1', OWNER);
  assert.deepEqual(members, [{ id: OWNER, username: 'owner', email: `${OWNER}@x.com` }]);
});

test('completeTask moves to Done and creates the next weekly occurrence in the previous column', async () => {
  const deps = makeDeps({
    boards: baseBoard(),
    members: [{ boardId: 'b1', userId: OWNER }],
    columns: baseColumns(),
    tasks: [{ id: 'tw', boardId: 'b1', columnId: 'c1', recurrence: { type: 'weekly', days: [2] }, completedAt: null }]
  });
  const service = new KanbanService(deps);
  const completed = await service.completeTask('tw', OWNER, '2026-08-25');
  assert.equal(completed.columnId, 'c3');
  assert.ok(completed.completedAt);
  assert.equal(deps.store.occurrences.length, 1);
  assert.equal(deps.store.occurrences[0].date, '2026-09-01'); // próximo martes
  assert.equal(deps.store.occurrences[0].columnId, 'c1');
});

test('synchronizeBoard archives stale non-weekly tasks using plain-object dates', async () => {
  const deps = makeDeps({
    boards: baseBoard(),
    members: [{ boardId: 'b1', userId: OWNER }],
    columns: baseColumns(),
    tasks: [
      { id: 't_old', boardId: 'b1', columnId: 'c1', recurrence: { type: 'none', days: [] }, completedAt: '2026-08-01T10:00:00.000Z', archivedAt: null },
      { id: 't_fresh', boardId: 'b1', columnId: 'c1', recurrence: { type: 'none', days: [] }, completedAt: null, archivedAt: null },
      { id: 'tw', boardId: 'b1', columnId: 'c1', recurrence: { type: 'weekly', days: [2] }, completedAt: null, archivedAt: null }
    ]
  });
  const service = new KanbanService(deps);
  await service.synchronizeBoard('b1', '2026-08-25');
  assert.equal(deps.store.tasks.find(task => task.id === 't_old').archivedAt, '2026-08-25');
  assert.equal(deps.store.tasks.find(task => task.id === 't_fresh').archivedAt, null);
  // La tarea semanal recibe su ocurrencia para el propio today (2026-08-25 es martes)
  const next = deps.store.occurrences.find(occurrence => occurrence.taskId === 'tw' && occurrence.date === '2026-08-25');
  assert.ok(next);
  assert.equal(next.columnId, 'c1');
});
