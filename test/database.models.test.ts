import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  UserModel,
  ProgressModel,
  closeDatabase,
  createUser,
  deleteUserProgress,
  findUserByEmail,
  findUserByIdentifier,
  getUserByField,
  getUserProgress,
  sequelize,
  updateUserProgress,
  updateUserProgressBulk
} from '../backend/infrastructure/models/database';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

test.after(async () => {
  await closeDatabase().catch(() => {});
});

function stringLength(attribute: { type: unknown }): number {
  return (attribute.type as unknown as { options: { length: number } }).options.length;
}

test('database models expose required schema and constraints', () => {
  assert.equal(UserModel.getTableName(), 'users');
  assert.equal(ProgressModel.getTableName(), 'progress');
  assert.equal(UserModel.rawAttributes.username.allowNull, false);
  assert.equal(stringLength(UserModel.rawAttributes.username as { type: unknown }), 50);
  assert.equal(stringLength(UserModel.rawAttributes.email as { type: unknown }), 255);
  assert.equal(stringLength(ProgressModel.rawAttributes.dayKey as { type: unknown }), 10);
  const statusValidate = ProgressModel.rawAttributes.status.validate as { isIn: [string[]] } | undefined;
  assert.deepEqual(statusValidate?.isIn[0], ['completed', 'partial', 'failed']);
});

test('database model validators reject invalid user and progress data without PostgreSQL', async () => {
  const user = UserModel.build({ username: 'ab', email: 'invalid', password: 'x' });
  await assert.rejects(user.validate());
  const progress = ProgressModel.build({ userId: 'u', dayKey: '2026-01-01', status: 'unknown' as never });
  await assert.rejects(progress.validate());
});

test('database rejects unknown user lookup fields', async () => {
  await assert.rejects(getUserByField('password', 'x'), /Campo inválido/);
});

const uniqueUser = (prefix: string) => {
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  return { username: `${prefix}_${suffix}`, email: `${prefix}_${suffix}@example.com` };
};

test('user lookups return null for unknown identifiers', async () => {
  await sequelize.sync();
  assert.equal(await findUserByIdentifier('ghost_that_does_not_exist'), null);
  assert.equal(await findUserByEmail('ghost_that_does_not_exist@example.com'), null);
  assert.equal(await getUserByField('username', 'ghost_that_does_not_exist'), null);
});

test('user lookups find persisted users by every valid field', async () => {
  await sequelize.sync();
  const { username, email } = uniqueUser('lookup');
  const created = await createUser(username, email, 'hashed');
  assert.equal((await findUserByIdentifier(username))?.id, created.id);
  assert.equal((await findUserByIdentifier(email.toUpperCase()))?.id, created.id);
  assert.equal((await findUserByEmail(email.toUpperCase()))?.id, created.id);
  assert.equal((await getUserByField('username', username))?.id, created.id);
  assert.equal((await getUserByField('email', email))?.id, created.id);
  assert.equal((await getUserByField('id', created.id))?.id, created.id);
  await UserModel.destroy({ where: { id: created.id } });
});

test('user creation maps unique violations to a business error', async () => {
  await sequelize.sync();
  const { username, email } = uniqueUser('dupe');
  const created = await createUser(username, email, 'hashed');
  await assert.rejects(createUser(username, `other_${email}`, 'hashed'), /ya está registrado/);
  await assert.rejects(createUser(`other_${username}`, email, 'hashed'), /ya está registrado/);
  await UserModel.destroy({ where: { id: created.id } });
});

test('progress helpers persist bulk updates and deletions', async () => {
  await sequelize.sync();
  const { username, email } = uniqueUser('progress');
  const created = await createUser(username, email, 'hashed');
  assert.deepEqual(await getUserProgress(created.id), {});
  await updateUserProgress(created.id, '2026-08-10', 'completed');
  await updateUserProgressBulk(created.id, { '2026-08-11': 'partial', '2026-08-12': 'failed' });
  assert.deepEqual(await getUserProgress(created.id), {
    '2026-08-10': 'completed',
    '2026-08-11': 'partial',
    '2026-08-12': 'failed'
  });
  assert.equal(await deleteUserProgress(created.id), 3);
  assert.deepEqual(await getUserProgress(created.id), {});
  await UserModel.destroy({ where: { id: created.id } });
});

