const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

const AuthController = require('../backend/controllers/auth.controller');
const AuthPresenter = require('../backend/presenters/auth.presenter');
const { sequelize } = require('../backend/models/database');
const app = require('../backend/server');

function responseDouble() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

async function request(path, options = {}) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}${path}`;
  try {
    return await fetch(url, options);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('AuthPresenter handles falsy createdAt values consistently', () => {
  const presenter = new AuthPresenter();
  const user = { id: 'u1', username: 'alice', email: 'alice@example.com', createdAt: 0 };
  assert.equal(presenter.presentLogin(user, 'token').user.createdAt, null);
});

test('AuthController exposes unexpected errors in development only', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const controller = new AuthController(
      { async execute() { throw new Error('database exploded'); } },
      { async execute() { throw new Error('database exploded'); } }
    );
    for (const action of ['register', 'login']) {
      const res = responseDouble();
      await controller[action]({ body: {} }, res);
      assert.equal(res.statusCode, 500);
      assert.deepEqual(res.body, { error: 'database exploded' });
    }
  } finally {
    process.env.NODE_ENV = previous;
  }
});

test('CORS rejects an origin outside the allow-list', async () => {
  const response = await request('/api/health', {
    headers: { Origin: 'https://evil.example' }
  });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'Origen no permitido' });
});

test('CORS allows requests without an Origin header', async () => {
  const response = await request('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
});

test('server returns 413 for oversized JSON payloads', async () => {
  const response = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'a', email: 'a@example.com', password: 'x'.repeat(101 * 1024) })
  });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: 'Payload demasiado grande' });
});

test('frontend fallback serves index for an unknown route', async () => {
  const response = await request('/some/client-side-route');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<title>2026/);
});

test('health endpoint returns 503 when the database is unavailable', async () => {
  const originalAuthenticate = sequelize.authenticate;
  sequelize.authenticate = async () => { throw new Error('database unavailable'); };
  try {
    const response = await request('/api/health');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: 'error', database: 'unavailable' });
  } finally {
    sequelize.authenticate = originalAuthenticate;
  }
});
