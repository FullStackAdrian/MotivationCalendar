import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { UserRepository } from '../backend/domain/repositories/user.repository';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';

import { UserService } from '../backend/domain/services/user.service';

interface RepositoryOverrides extends Partial<UserRepository> {}

function buildService(repositoryOverrides: RepositoryOverrides = {}) {
  const repository: UserRepository = {
    findByIdentifier: async () => null,
    findByEmail: async () => null,
    findById: async () => null,
    create: async ({ username, email, passwordHash }) => ({ id: 'u1', username, email, password: passwordHash }),
    ...repositoryOverrides
  };
  return { service: new UserService({ userRepository: repository }), repository };
}

test('service sanitizes plain and Sequelize-like users', async () => {
  const { service } = buildService();
  assert.deepEqual(service._sanitizeUser({ id: '1', password: 'x', username: 'a' } as never), { id: '1', username: 'a' });
  assert.deepEqual(service._sanitizeUser({ toJSON: () => ({ id: '2', password: 'x', username: 'b' }) } as never), { id: '2', username: 'b' });
  assert.equal(service._sanitizeUser(null), null);
});

test('domain service no longer exposes auth concerns', async () => {
  const { service } = buildService();
  assert.equal(typeof (service as Record<string, unknown>).verifyPassword, 'undefined');
  assert.equal(typeof (service as Record<string, unknown>).generateToken, 'undefined');
});

test('findByUsernameOrEmail falls back to the email lookup', async () => {
  const byEmail = { id: 'u2', username: 'bob' };
  const { service } = buildService({
    findByIdentifier: async (identifier) => identifier === 'alice' ? { id: 'u1', username: '', email: '' } : null,
    findByEmail: async () => byEmail
  });
  assert.deepEqual(await service.findByUsernameOrEmail('alice'), { id: 'u1', username: '', email: '' });
  assert.deepEqual(await service.findByUsernameOrEmail('ghost', 'ghost@x.com'), byEmail);
});

test('createUser delegates persistence to the repository and strips the hash', async () => {
  let received;
  const { service } = buildService({
    create: async (data) => {
      received = data;
      return { id: 'u9', username: data.username, email: data.email, password: data.passwordHash };
    }
  });
  const created = await service.createUser({ username: 'alice', email: 'a@b.com', passwordHash: 'hash123' });
  assert.deepEqual(received, { username: 'alice', email: 'a@b.com', passwordHash: 'hash123' });
  assert.equal((created as Record<string, unknown>).password, undefined);
});
