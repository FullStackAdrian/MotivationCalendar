import '../helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  UserModel,
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
} from '../../backend/infrastructure/models/database';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

test.after(async () => {
  await closeDatabase().catch(() => {});
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
    '2026-08-11': 'partial',
    '2026-08-12': 'failed',
    '2026-08-10': 'completed'
  });
  assert.equal(await deleteUserProgress(created.id), 3);
  assert.deepEqual(await getUserProgress(created.id), {});
  await UserModel.destroy({ where: { id: created.id } });
});
