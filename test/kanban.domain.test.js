const test = require('node:test');
const assert = require('node:assert/strict');

const {
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
} = require('../backend/domain/kanban');

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
  assert.equal(result.next.date, '2026-08-12');
  assert.equal(result.next.status, 'todo');
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
});
