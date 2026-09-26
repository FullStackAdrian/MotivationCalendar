import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Request, Response } from 'express';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

import { AuthController } from '../backend/infrastructure/controllers/auth.controller';
import { AuthPresenter } from '../backend/infrastructure/presenters/auth.presenter';
import { sequelize } from '../backend/infrastructure/models/database';
import app from '../backend/server';

function responseDouble(): Response {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; }
  } as unknown as Response;
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`;
  try {
    return await fetch(url, options);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('AuthPresenter handles falsy createdAt values consistently', () => {
  const presenter = new AuthPresenter();
  const user = { id: 'u1', username: 'alice', email: 'alice@example.com', createdAt: 0 };
  assert.equal(presenter.presentLogin(user as never, 'token').user.createdAt, null);
});

test('AuthController exposes unexpected errors in development only', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const controller = new AuthController({
      registerUseCase: { async execute() { throw new Error('database exploded'); } },
      loginUseCase: { async execute() { throw new Error('database exploded'); } }
    } as never);
    for (const action of ['register', 'login'] as const) {
      const res = responseDouble();
      await controller[action]({ body: {} } as unknown as Request, res);
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
  const sequelizeRef = sequelize as unknown as { authenticate: () => Promise<void> };
  const originalAuthenticate = sequelizeRef.authenticate;
  sequelizeRef.authenticate = async () => { throw new Error('database unavailable'); };
  try {
    const response = await request('/api/health');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: 'error', database: 'unavailable' });
  } finally {
    sequelizeRef.authenticate = originalAuthenticate;
  }
});
