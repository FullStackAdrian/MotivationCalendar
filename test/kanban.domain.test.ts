import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createBoard,
  createColumn,
  moveColumn,
  createTask,
  validateRecurrence,
  getNextOccurrenceDate,
  completeOccurrence,
  transitionTasksForDate,
  canNotifyTask,
  calculateTaskEffort
} from '../backend/domain/kanban';

test('creates a board with an owner and empty columns', () => {
  const board = createBoard({ name: 'Trabajo', ownerId: 'u1' });
  assert.equal(board.name, 'Trabajo');
  assert.equal(board.ownerId, 'u1');
  assert.deepEqual(board.columns, []);
});

test('creates columns with explicit order and semantic pause/done flags', () => {
  const pause = createColumn({ boardId: 'b1', name: 'Pausa', color: '#777', position: 2, isPaused: true });
  const done = createColumn({ boardId: 'b1', name: 'Done', color: '#0a0', position: 3, isDone: true });
  assert.equal(pause.isPaused, true);
  assert.equal(done.isDone, true);
});

test('reorders columns without relying on their names', () => {
  const columns = [
    createColumn({ boardId: 'b1', name: 'Todo', position: 0 }),
    createColumn({ boardId: 'b1', name: 'Pausa', position: 1, isPaused: true }),
    createColumn({ boardId: 'b1', name: 'Done', position: 2, isDone: true })
  ];
  const reordered = moveColumn(columns, columns[2].id, 0);
  assert.deepEqual(reordered.map(c => c.name), ['Done', 'Todo', 'Pausa']);
  assert.deepEqual(reordered.map(c => c.position), [0, 1, 2]);
});

test('creates a task with optional scheduling, assignment, tags, priority, effort and duration', () => {
  const task = createTask({
    boardId: 'b1',
    columnId: 'c1',
    title: 'Implementar login',
    assigneeId: 'u1',
    priority: 'high',
    effortPoints: 5,
    estimatedMinutes: 30,
    dueDate: '2026-08-11',
    dueTime: '18:30',
    tags: ['backend', 'security']
  });
  assert.equal(task.assigneeId, 'u1');
  assert.equal(task.priority, 'high');
  assert.equal(task.effortPoints, 5);
  assert.equal(task.estimatedMinutes, 30);
  assert.equal(task.dueTime, '18:30');
  assert.deepEqual(task.tags, ['backend', 'security']);
});

test('allows tasks without recurrence and weekly recurrence only with at least one day', () => {
  assert.deepEqual(validateRecurrence(null), { type: 'none', days: [] });
  assert.deepEqual(validateRecurrence({ type: 'weekly', days: [1, 3, 5] }), { type: 'weekly', days: [1, 3, 5] });
  assert.throws(() => validateRecurrence({ type: 'weekly', days: [] }), /día/i);
});

test('calculates the next weekly occurrence using ISO weekday numbers', () => {
  assert.equal(getNextOccurrenceDate('2026-08-10', [1, 3, 5]), '2026-08-12');
  assert.equal(getNextOccurrenceDate('2026-08-14', [1, 3, 5]), '2026-08-17');
});

test('recurring completion creates a completed occurrence and next pending occurrence', () => {
  const result = completeOccurrence({
    task: { id: 't1', recurrence: { type: 'weekly', days: [1, 3, 5] } },
    occurrence: { date: '2026-08-10', status: 'todo' },
    doneColumnId: 'done'
  });
  assert.equal(result.completed.status, 'done');
  assert.equal(result.next?.date, '2026-08-12');
  assert.equal(result.next?.status, 'todo');
});

test('non recurring completed tasks are archived on the following day', () => {
  const tasks = [{ id: 't1', recurrence: { type: 'none' }, status: 'done', completedAt: '2026-08-10T20:00:00Z', archivedAt: null }];
  const result = transitionTasksForDate(tasks, '2026-08-11');
  assert.equal(result[0].archivedAt, '2026-08-11');
});

test('recurring completed tasks are not archived on the next day', () => {
  const tasks = [{ id: 't1', recurrence: { type: 'weekly', days: [1, 3] }, status: 'done', completedAt: '2026-08-10T20:00:00Z', archivedAt: null }];
  const result = transitionTasksForDate(tasks, '2026-08-11');
  assert.equal(result[0].archivedAt, null);
});

test('paused tasks are semantically excluded from future notification decisions', () => {
  assert.equal(canNotifyTask({ status: { isPaused: true } }), false);
  assert.equal(canNotifyTask({ status: { isPaused: false }, archivedAt: null }), true);
});

test('effort points and estimated time remain independent dimensions', () => {
  assert.deepEqual(calculateTaskEffort({ effortPoints: 5, estimatedMinutes: 30 }), { effortPoints: 5, estimatedMinutes: 30 });
  assert.deepEqual(calculateTaskEffort({}), { effortPoints: null, estimatedMinutes: null });
});

test('board creation validates owner, name and color fallbacks', () => {
  assert.throws(() => createBoard({ name: 'X' }), /propietario/i);
  assert.throws(() => createBoard({ ownerId: 'u1', name: '  ' }), /nombre/i);
  assert.throws(() => createBoard({ ownerId: 'u1', name: 42 }), /nombre/i);
  const fallback = createBoard({ ownerId: 'u1', name: ' B ', color: 42 });
  assert.equal(fallback.name, 'B');
  assert.equal(fallback.color, '#6366f1');
});

test('column creation validates board, position and wip limits', () => {
  assert.throws(() => createColumn({ name: 'Todo', position: 0 }), /pizarra/i);
  for (const position of [-1, 1.5, '0', Number.NaN]) {
    assert.throws(() => createColumn({ boardId: 'b1', name: 'Todo', position }), /posición/i);
  }
  for (const wipLimit of [0, -2, 1.5, '3']) {
    assert.throws(() => createColumn({ boardId: 'b1', name: 'Todo', position: 0, wipLimit }), /WIP/i);
  }
  const column = createColumn({ boardId: 'b1', name: ' Todo ', position: 0, color: null, wipLimit: 2 });
  assert.equal(column.name, 'Todo');
  assert.equal(column.color, '#64748b');
});

test('column moves reject invalid targets and unknown columns', () => {
  const columns = [
    createColumn({ boardId: 'b1', name: 'A', position: 0 }),
    createColumn({ boardId: 'b1', name: 'B', position: 1 })
  ];
  for (const targetPosition of [-1, 2, 1.5, '1', null]) {
    assert.throws(() => moveColumn(columns, columns[0].id, targetPosition), /posición/i);
  }
  assert.throws(() => moveColumn(columns, 'missing', 0), /no encontrado/i);
});

test('recurrence validation covers every branch', () => {
  assert.deepEqual(validateRecurrence(undefined), { type: 'none', days: [] });
  assert.deepEqual(validateRecurrence({ type: 'weekly', days: [3, 1, 3] }), { type: 'weekly', days: [1, 3] });
  assert.throws(() => validateRecurrence({ type: 'monthly' }), /frecuencia/i);
  assert.throws(() => validateRecurrence({ type: 'weekly' }), /día/i);
  for (const days of [[0], [8], [1.5], ['x']]) {
    assert.throws(() => validateRecurrence({ type: 'weekly', days }), /día/i);
  }
});

test('task creation validates every field', () => {
  assert.throws(() => createTask({ title: 'T' }), /obligatorio/i);
  assert.throws(() => createTask({ boardId: 'b', columnId: 'c', title: '' }), /nombre/i);
  assert.throws(() => createTask({ boardId: 'b', columnId: 'c', title: 'T', priority: 'urgent' }), /prioridad/i);
  assert.throws(() => createTask({ boardId: 'b', columnId: 'c', title: 'T', effortPoints: 0 }), /puntos/i);
  assert.throws(() => createTask({ boardId: 'b', columnId: 'c', title: 'T', estimatedMinutes: 1.5 }), /duración/i);
  assert.throws(() => createTask({ boardId: 'b', columnId: 'c', title: 'T', dueTime: '25:00' }), /hora/i);
  assert.throws(() => createTask({ boardId: 'b', columnId: 'c', title: 'T', dueDate: 'tomorrow' }), /fecha/i);
  const task = createTask({ boardId: 'b', columnId: 'c', title: 'T', tags: ['a', ' a ', 42, '', null] });
  assert.deepEqual(task.tags, ['a']);
});

test('next occurrence rejects empty days and invalid dates', () => {
  assert.throws(() => getNextOccurrenceDate('2026-08-10', []), /frecuencia/i);
  assert.throws(() => getNextOccurrenceDate('not-a-date', [1]), /fecha/i);
});

test('occurrence completion requires entities and skips non-weekly tasks', () => {
  assert.throws(() => completeOccurrence({ task: null, occurrence: { date: '2026-08-10' }, doneColumnId: 'd' } as never), /obligatoria/i);
  const plain = completeOccurrence({
    task: { id: 't1', recurrence: { type: 'none', days: [] } },
    occurrence: { date: '2026-08-10' },
    doneColumnId: 'd'
  });
  assert.equal(plain.next, null);
  assert.equal(plain.completed.status, 'done');
});

test('date transitions keep archived, pending, future and weekly tasks', () => {
  const tasks = [
    { id: 'archived', status: 'done', completedAt: '2026-08-01T10:00:00Z', archivedAt: '2026-08-02' },
    { id: 'pending', status: 'todo', completedAt: null, archivedAt: null },
    { id: 'nodate', status: 'done', completedAt: null, archivedAt: null },
    { id: 'future', status: 'done', completedAt: '2026-08-12T10:00:00Z', archivedAt: null }
  ];
  const result = transitionTasksForDate(tasks, '2026-08-11');
  assert.deepEqual(result.map(task => task.archivedAt), ['2026-08-02', null, null, null]);
});

test('notification eligibility covers malformed and done tasks', () => {
  assert.equal(canNotifyTask(null), false);
  assert.equal(canNotifyTask('task'), false);
  assert.equal(canNotifyTask({ archivedAt: '2026-08-01' }), false);
  assert.equal(canNotifyTask({ status: { isDone: true } }), false);
  assert.equal(canNotifyTask({}), true);
});
