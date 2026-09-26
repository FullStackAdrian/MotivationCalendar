import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { AuthController } from '../backend/infrastructure/controllers/auth.controller';

function res(): Response {
  return {
    code: 200,
    body: null,
    status(c: number) { this.code = c; return this; },
    json(b: unknown) { this.body = b; return this; }
  } as unknown as Response;
}

function req(body: unknown): Request {
  return { body } as unknown as Request;
}

test('controller forwards valid register and login payloads', async () => {
  const calls: unknown[] = [];
  const c = new AuthController({
    registerUseCase: { async execute(x: unknown) { calls.push(x); return { ok: true }; } },
    loginUseCase: { async execute(x: unknown) { calls.push(x); return { ok: true }; } }
  });
  let r = res();
  await c.register(req({ username: 'a', email: 'a@b.com', password: 'secret123' }), r);
  assert.equal(r.code, 201);
  r = res();
  await c.login(req({ identifier: 'a', password: 'secret123' }), r);
  assert.equal(r.code, 200);
  assert.equal(calls.length, 2);
});

test('controller handles null, arrays and primitive bodies', async () => {
  const calls: unknown[] = [];
  const c = new AuthController({
    registerUseCase: { async execute(x: unknown) { calls.push(x); return {}; } },
    loginUseCase: { async execute(x: unknown) { calls.push(x); return {}; } }
  });
  for (const body of [null, [], 'text', 42]) await c.register(req(body), res());
  for (const body of [null, [], 'text', 42]) await c.login(req(body), res());
  assert.equal(calls.length, 8);
});

test('controller maps semantic codes to HTTP statuses', async () => {
  const codedError = (message: string, code?: string): Error => {
    const e = new Error(message);
    if (code) (e as Error & { code?: string }).code = code;
    return e;
  };
  const cases = [
    [codedError('Credenciales inválidas', 'UNAUTHORIZED'), 401],
    [codedError('El usuario o email ya está registrado', 'CONFLICT'), 409],
    [codedError('El email no es válido', 'VALIDATION_ERROR'), 400],
    [codedError('unexpected'), 500]
  ];
  for (const [error, expected] of cases as Array<[Error, number]>) {
    const c = new AuthController({
      registerUseCase: { async execute() { throw error; } },
      loginUseCase: { async execute() { throw error; } }
    });
    const r = res();
    await c.register(req({}), r);
    assert.equal(r.code, expected);
    const l = res();
    await c.login(req({}), l);
    assert.equal(l.code, expected);
  }
});
