import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  closeDatabase,
  createUser,
  sequelize,
  UserModel
} from '../backend/infrastructure/models/database';
import {
  BoardMemberModel,
  BoardModel,
  ColumnModel,
  TaskModel,
  TaskOccurrenceModel
} from '../backend/infrastructure/models/kanban.database';
import { SequelizeBoardRepository } from '../backend/infrastructure/repositories/sequelize-board.repository';
import { SequelizeColumnRepository } from '../backend/infrastructure/repositories/sequelize-column.repository';
import { SequelizeTaskRepository } from '../backend/infrastructure/repositories/sequelize-task.repository';
import { SequelizeUserRepository } from '../backend/infrastructure/repositories/sequelize-user.repository';

const boards = new SequelizeBoardRepository();
const columns = new SequelizeColumnRepository();
const tasks = new SequelizeTaskRepository();
const users = new SequelizeUserRepository();

const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
let ownerId: string;
let memberId: string;
let boardId: string;
let columnId: string;
let doneColumnId: string;

test.before(async () => {
  await sequelize.sync();
  const owner = await createUser(`repo_owner_${suffix}`, `repo_owner_${suffix}@example.com`, 'hashed');
  ownerId = owner.id;
  const member = await createUser(`repo_member_${suffix}`, `repo_member_${suffix}@example.com`, 'hashed');
  memberId = member.id;
  const board = await boards.createWithDefaults(
    { name: `Repo ${suffix}`, description: null, color: '#6366f1', ownerId },
    ownerId,
    [
      { name: 'Todo', color: '#3b82f6' },
      { name: 'Done', color: '#22c55e', isDone: true }
    ]
  );
  boardId = board.id;
  const ordered = await columns.listByBoardOrdered(boardId);
  columnId = ordered.find((column) => !column.isDone)!.id;
  doneColumnId = ordered.find((column) => column.isDone)!.id;
});

test.after(async () => {
  await BoardModel.destroy({ where: { id: boardId } }).catch(() => {});
  await UserModel.destroy({ where: { id: memberId } }).catch(() => {});
  await UserModel.destroy({ where: { id: ownerId } }).catch(() => {});
  await closeDatabase().catch(() => {});
});

test('board repository resolves nulls and membership', async () => {
  assert.equal(await boards.findByIdWithDetails('00000000-0000-0000-0000-000000000000'), null);
  assert.equal(await boards.isOwner(boardId, 'ghost'), false);
  assert.equal(await boards.isOwner(boardId, ownerId), true);
  assert.equal(await boards.hasAccess(boardId, ownerId), true);
  assert.equal(await boards.hasAccess(boardId, 'ghost'), false);

  const details = await boards.findByIdWithDetails(boardId);
  assert.equal(details?.columns.length, 2);
  assert.equal((await boards.listVisibleByUser('ghost')).length, 0);
  assert.ok((await boards.listVisibleByUser(ownerId)).some((board) => board.id === boardId));

  const first = await boards.addMemberIfAbsent(boardId, memberId, 'member');
  assert.equal(first.created, true);
  assert.equal(first.member?.role, 'member');
  const second = await boards.addMemberIfAbsent(boardId, memberId, 'member');
  assert.equal(second.created, false);
  assert.equal(await boards.hasAccess(boardId, memberId), true);
  assert.equal(await boards.isMemberRow(boardId, 'ghost'), false);
  assert.equal((await boards.listMemberUsers(boardId)).length, 2);
  await BoardMemberModel.destroy({ where: { boardId, userId: memberId } });
});

test('board creation rolls back when a default column is invalid', async () => {
  const before = await BoardModel.count();
  await assert.rejects(
    boards.createWithDefaults(
      { name: `Broken ${suffix}`, description: null, color: '#6366f1', ownerId },
      ownerId,
      [{ name: 'Ok', color: '#fff' }, { name: null as never, color: '#fff' }]
    )
  );
  assert.equal(await BoardModel.count(), before);
});

test('column repository resolves nulls and persists ordering', async () => {
  assert.equal(await columns.findById('00000000-0000-0000-0000-000000000000'), null);
  assert.equal(await columns.findByIdInBoard(columnId, '00000000-0000-0000-0000-000000000000'), null);
  assert.ok(await columns.findById(columnId));
  assert.equal(await columns.countByBoard(boardId), 2);
  assert.equal((await columns.findDoneByBoard(boardId))?.id, doneColumnId);

  const created = await columns.create({ boardId, name: 'Extra', color: '#fff', position: 2, isDone: false, isPaused: false, wipLimit: null });
  assert.equal(await columns.countByBoard(boardId), 3);
  const updated = await columns.update(created.id, { wipLimit: 3 });
  assert.equal(updated?.wipLimit, 3);
  assert.equal(await columns.update('00000000-0000-0000-0000-000000000000', { name: 'X' }), null);

  const current = await columns.listByBoardOrdered(boardId);
  await columns.updatePositions(current.map((column) => ({ id: column.id, position: current.length - 1 - column.position })));
  const reversed = await columns.listByBoardOrdered(boardId);
  assert.deepEqual(reversed.map((column) => column.position), [0, 1, 2]);
  await ColumnModel.destroy({ where: { id: created.id } });
  assert.equal(await columns.findDoneByBoard('00000000-0000-0000-0000-000000000000'), null);
});

test('task repository resolves nulls and filters by board state', async () => {
  assert.equal(await tasks.findById('00000000-0000-0000-0000-000000000000'), null);
  assert.equal(await tasks.update('00000000-0000-0000-0000-000000000000', { columnId }), null);
  assert.equal(await tasks.updateOccurrence('00000000-0000-0000-0000-000000000000', { status: 'done' }), null);
  assert.equal(await tasks.findOccurrenceByTaskAndDate('00000000-0000-0000-0000-000000000000', '2026-08-25'), null);

  const task = await tasks.create({
    boardId, columnId, title: 'Repo task', description: null, assigneeId: ownerId,
    priority: 'high', effortPoints: 3, estimatedMinutes: 30, dueDate: '2026-08-25',
    dueTime: '18:30', tags: ['repo'], recurrence: { type: 'none', days: [] },
    archivedAt: null, completedAt: null
  });
  assert.ok((await tasks.findById(task.id))?.title === 'Repo task');
  assert.equal(await tasks.countActiveInColumn(boardId, columnId), 1);

  const moved = await tasks.update(task.id, { columnId: doneColumnId });
  assert.equal(moved?.columnId, doneColumnId);
  assert.equal(await tasks.countActiveInColumn(boardId, columnId), 0);

  const archived = await tasks.update(task.id, { archivedAt: '2026-08-26' });
  assert.equal(archived?.archivedAt, '2026-08-26');
  assert.deepEqual(await tasks.listActiveByBoard(boardId), []);
  assert.equal((await tasks.listArchived(boardId)).length, 1);
  assert.equal((await tasks.listArchived(boardId, { assigneeId: 'ghost' })).length, 0);
  await TaskModel.destroy({ where: { id: task.id } });
});

test('task occurrences find, deduplicate and update', async () => {
  const task = await tasks.create({
    boardId, columnId, title: 'Occ task', description: null, assigneeId: null,
    priority: 'medium', effortPoints: null, estimatedMinutes: null, dueDate: null,
    dueTime: null, tags: [], recurrence: { type: 'weekly', days: [2] },
    archivedAt: null, completedAt: null
  });
  assert.equal(await tasks.findFirstTodoOccurrence(task.id), null);
  await tasks.createOccurrence({ taskId: task.id, date: '2026-09-01', status: 'todo', columnId });
  await tasks.createOccurrence({ taskId: task.id, date: '2026-08-25', status: 'todo', columnId });
  assert.equal((await tasks.findFirstTodoOccurrence(task.id))?.date, '2026-08-25');
  assert.equal((await tasks.findOccurrenceByTaskAndDate(task.id, '2026-08-25'))?.status, 'todo');

  const existing = await tasks.findOrCreateNextOccurrence(task.id, '2026-08-25', { status: 'todo', columnId });
  const created = await tasks.findOrCreateNextOccurrence(task.id, '2026-09-08', { status: 'todo', columnId });
  assert.notEqual(created.id, existing.id);
  const again = await tasks.findOrCreateNextOccurrence(task.id, '2026-09-08', { status: 'todo', columnId });
  assert.equal(again.id, created.id);

  const done = await tasks.updateOccurrence(existing.id, { status: 'done' });
  assert.equal(done?.status, 'done');
  await TaskOccurrenceModel.destroy({ where: { taskId: task.id } });
  await TaskModel.destroy({ where: { id: task.id } });
});

test('user repository resolves every lookup branch', async () => {
  assert.equal(await users.findById('ghost'), null);
  assert.equal(await users.findByIdentifier('ghost'), null);
  assert.equal(await users.findByEmail('ghost@example.com'), null);
  assert.equal((await users.findByIdentifier(`repo_owner_${suffix}`))?.id, ownerId);
  assert.equal((await users.findByIdentifier(`REPO_OWNER_${suffix}@EXAMPLE.COM`))?.id, ownerId);
  assert.equal((await users.findByEmail(`repo_owner_${suffix}@example.com`))?.id, ownerId);
  assert.equal((await users.findById(ownerId))?.id, ownerId);
  await assert.rejects(
    users.create({ username: `repo_owner_${suffix}`, email: `other_${suffix}@example.com`, passwordHash: 'x' }),
    /ya está registrado/
  );
});
