import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { PasswordHasher } from '../backend/infrastructure/security/password-hasher';
import { TokenProvider } from '../backend/infrastructure/security/token-provider';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

test('PasswordHasher hashes and verifies with bcrypt', async () => {
  const hasher = new PasswordHasher(4);
  assert.equal(hasher.saltRounds, 4);
  const hash = await hasher.hash('secret123');
  assert.notEqual(hash, 'secret123');
  assert.equal(await hasher.compare('secret123', hash), true);
  assert.equal(await hasher.compare('wrong-password', hash), false);
});

test('TokenProvider signs the expected payload and verifies roundtrip', () => {
  const provider = new TokenProvider();
  const token = provider.generate({ id: 'u1', username: 'alice' });
  const decoded = jwt.verify(token, 'test-secret') as { userId?: string; username?: string };
  assert.equal(decoded.userId, 'u1');
  assert.equal(decoded.username, 'alice');

  const verified = provider.verify(token);
  assert.equal(verified.userId, 'u1');
});

test('TokenProvider rejects tampered tokens', () => {
  const provider = new TokenProvider();
  assert.throws(() => provider.verify('not-a-token'));
  assert.throws(() => provider.verify(''));
});

test('TokenProvider rejects tokens with an invalid signature', () => {
  const provider = new TokenProvider();
  const forged = jwt.sign({ userId: 'u1', username: 'alice' }, 'wrong-secret');
  assert.throws(() => provider.verify(forged), /invalid signature/i);
});

test('TokenProvider rejects expired tokens', () => {
  const provider = new TokenProvider();
  const expired = jwt.sign({ userId: 'u1', username: 'alice' }, 'test-secret', { expiresIn: '-10s' });
  assert.throws(() => provider.verify(expired), /expired/i);
});

test('TokenProvider rejects tokens with an unexpected algorithm', () => {
  const provider = new TokenProvider();
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ userId: 'u1', username: 'alice' })).toString('base64url');
  assert.throws(() => provider.verify(`${header}.${body}.`));
});

test('PasswordHasher uses a default cost factor and tolerates corrupt hashes', async () => {
  const hasher = new PasswordHasher();
  assert.equal(hasher.saltRounds, 10);
  const hash = await hasher.hash('secret123');
  assert.equal(await hasher.compare('', hash), false);
  assert.equal(await hasher.compare('secret123', 'not-a-valid-hash'), false);
  assert.equal(await hasher.compare('secret123', ''), false);
});
