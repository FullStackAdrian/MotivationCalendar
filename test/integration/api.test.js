const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/motivation_calendar_test';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

const app = require('../../backend/server');
const { initializeDatabase, closeDatabase, sequelize } = require('../../backend/models/database');

let server;
let baseUrl;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, body };
}

function json(method, body, token) {
  return {
    method,
    body: JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  };
}

test.before(async () => {
  await initializeDatabase();
  await sequelize.sync({ force: true });
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
});

test('health and frontend smoke endpoints work', async () => {
  const health = await request('/api/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.status, 'ok');

  const index = await request('/');
  assert.equal(index.response.status, 200);
  assert.match(index.body, /<title>2026/);

  const asset = await request('/assets/js/api-client.js');
  assert.equal(asset.response.status, 200);
  assert.match(asset.body, /APP_CONFIG/);
});

test('register, duplicate conflicts and login flow', async () => {
  const registration = await request('/api/auth/register', json('POST', {
    username: 'alice', email: 'alice@example.com', password: 'password123'
  }));
  assert.equal(registration.response.status, 201);
  assert.ok(registration.body.token);

  const duplicateEmail = await request('/api/auth/register', json('POST', {
    username: 'alice2', email: 'alice@example.com', password: 'password123'
  }));
  assert.equal(duplicateEmail.response.status, 409);

  const duplicateUsername = await request('/api/auth/register', json('POST', {
    username: 'alice', email: 'alice2@example.com', password: 'password123'
  }));
  assert.equal(duplicateUsername.response.status, 409);

  const login = await request('/api/auth/login', json('POST', {
    identifier: 'alice', password: 'password123'
  }));
  assert.equal(login.response.status, 200);
  assert.ok(login.body.token);

  const badPassword = await request('/api/auth/login', json('POST', {
    identifier: 'alice', password: 'wrong-password'
  }));
  assert.equal(badPassword.response.status, 401);

  return login.body.token;
});

test('progress is authenticated, isolated and persistent', async () => {
  const alice = await request('/api/auth/login', json('POST', {
    identifier: 'alice', password: 'password123'
  }));
  const aliceToken = alice.body.token;

  const bob = await request('/api/auth/register', json('POST', {
    username: 'bob', email: 'bob@example.com', password: 'password123'
  }));
  const bobToken = bob.body.token;

  const unauthenticated = await request('/api/progress');
  assert.equal(unauthenticated.response.status, 401);

  const invalidJwt = await request('/api/progress', {
    headers: { Authorization: 'Bearer invalid.jwt.token' }
  });
  assert.equal(invalidJwt.response.status, 401);

  const created = await request('/api/progress/2026-08-10', json('PUT', { status: 'completed' }, aliceToken));
  assert.equal(created.response.status, 200);
  assert.equal(created.body.progress['2026-08-10'], 'completed');

  const bulk = await request('/api/progress/bulk', json('POST', {
    updates: { '2026-08-11': 'partial', '2026-08-12': 'failed' }
  }, aliceToken));
  assert.equal(bulk.response.status, 200);
  assert.equal(bulk.body.updatedCount, 2);

  const bobProgress = await request('/api/progress', { headers: { Authorization: `Bearer ${bobToken}` } });
  assert.equal(bobProgress.response.status, 200);
  assert.deepEqual(bobProgress.body.progress, {});

  const connection = await sequelize.connectionManager.getConnection();
  await sequelize.connectionManager.releaseConnection(connection);
  const persisted = await request('/api/progress', { headers: { Authorization: `Bearer ${aliceToken}` } });
  assert.equal(persisted.response.status, 200);
  assert.equal(persisted.body.progress['2026-08-10'], 'completed');
  assert.equal(persisted.body.progress['2026-08-11'], 'partial');

  const deleted = await sequelize.models.Progress.destroy({ where: { userId: alice.body.user.id } });
  assert.equal(deleted, 3);

  const afterDelete = await request('/api/progress', { headers: { Authorization: `Bearer ${aliceToken}` } });
  assert.deepEqual(afterDelete.body.progress, {});
});
