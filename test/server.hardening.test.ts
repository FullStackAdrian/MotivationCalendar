import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Request, Response } from 'express';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
// Límite bajo a propósito: este fichero corre en su propio proceso,
// así que no afecta al resto de la suite.
process.env.AUTH_RATE_LIMIT_MAX = '10';

import { AuthController } from '../backend/infrastructure/controllers/auth.controller';
import { closeDatabase } from '../backend/infrastructure/models/database';
import { mapKanbanErrorResponse } from '../backend/infrastructure/routes/kanban';
import app from '../backend/server';

test.after(async () => {
  // El health con BD local abre el pool; cerrarlo para salir rápido.
  await closeDatabase().catch(() => {});
});

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

test('unknown routes return JSON 404 on the API-only backend', async () => {
  // Rutas sin middleware de auth (con auth responderían 401, que es correcto).
  for (const path of ['/nope', '/api/nope']) {
    const response = await request(path);
    assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type') || '', /application\/json/);
    assert.deepEqual(await response.json(), { error: 'No encontrado' });
  }
});

test('health response carries no environment details', async () => {
  const response = await request('/api/health');
  assert.ok(response.status === 200 || response.status === 503);
  const body = (await response.json()) as Record<string, unknown>;
  assert.ok(!('environment' in body), 'health must not leak environment details');
  assert.equal(body.status, response.status === 200 ? 'ok' : 'error');
});

test('security headers include CSP and HSTS only in production', async () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'test';
    const plain = await request('/api/health');
    assert.ok((plain.headers.get('content-security-policy') || '').includes("default-src 'none'"));
    assert.equal(plain.headers.get('strict-transport-security'), null);

    process.env.NODE_ENV = 'production';
    const prod = await request('/api/health');
    assert.match(prod.headers.get('strict-transport-security') || '', /max-age=/);
  } finally {
    process.env.NODE_ENV = previous;
  }
});

test('AuthController hides unexpected error details outside development', async () => {
  const previous = process.env.NODE_ENV;
  const failing = {
    async execute(): Promise<never> { throw new Error('database exploded'); }
  };
  const controller = new AuthController({ registerUseCase: failing, loginUseCase: failing } as never);
  const responseDouble = (): Response => ({
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; }
  } as unknown as Response);
  try {
    process.env.NODE_ENV = 'production';
    for (const action of ['register', 'login'] as const) {
      const res = responseDouble();
      await controller[action]({ body: {} } as unknown as Request, res);
      assert.equal(res.statusCode, 500);
      assert.deepEqual((res as unknown as { body: unknown }).body, { error: 'Error interno del servidor' });
    }
  } finally {
    process.env.NODE_ENV = previous;
  }
});

test('kanban business errors map to 403/404/400 and unknown errors fall through', async () => {
  assert.deepEqual(mapKanbanErrorResponse(new Error('No autorizado')), { status: 403, body: { error: 'No autorizado' } });
  assert.deepEqual(mapKanbanErrorResponse(new Error('Estado no encontrado')), { status: 404, body: { error: 'Tablero no encontrado' } });
  assert.deepEqual(mapKanbanErrorResponse(new Error('Usuario no encontrado')), { status: 400, body: { error: 'Usuario no encontrado' } });
  assert.equal(mapKanbanErrorResponse(new Error('connection reset')), null);
});

test('auth endpoints are rate limited (11th login attempt is rejected)', async () => {  // Cuerpo vacío → 400 de validación antes de tocar la BD (hermético y rápido).
  const options = (): RequestInit => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  let lastStatus = 0;
  let lastBody: unknown;
  for (let attempt = 1; attempt <= 11; attempt += 1) {
    const response = await request('/api/auth/login', options());
    lastStatus = response.status;
    lastBody = await response.json();
    if (attempt <= 10) assert.equal(lastStatus, 400, `attempt ${attempt} got ${lastStatus}`);
  }
  assert.equal(lastStatus, 429);
  assert.match((lastBody as { error: string }).error, /demasiadas|429|intentos/i);
});
