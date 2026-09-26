import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

import { AuthController } from '../backend/infrastructure/controllers/auth.controller';
import { AuthPresenter } from '../backend/infrastructure/presenters/auth.presenter';
import { UserService } from '../backend/domain/services/user.service';
import { verifyToken } from '../backend/infrastructure/middleware/auth';
import { getUserByField } from '../backend/infrastructure/models/database';

function responseDouble(): Response {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; }
  } as unknown as Response;
}

test('AuthPresenter formats registration and login responses without passwords', () => {
  const presenter = new AuthPresenter();
  const user = { id: 'u1', username: 'alice', email: 'alice@example.com', password: 'secret', createdAt: '2026-01-01' };
  assert.deepEqual(presenter.presentRegistration(user, 'token'), { message: 'Usuario registrado exitosamente', token: 'token', user: { id: 'u1', username: 'alice', email: 'alice@example.com', createdAt: '2026-01-01' } });
  assert.equal(presenter.presentLogin({ ...user, createdAt: undefined }, 'token2').user.createdAt, null);
});

test('AuthController returns success responses', async () => {
  const controller = new AuthController({
    registerUseCase: { async execute(input: unknown) { assert.deepEqual(input, { username: 'a', email: 'a@a.com', password: 'secret123' }); return { token: 'r' }; } },
    loginUseCase: { async execute(input: unknown) { assert.deepEqual(input, { identifier: 'a', password: 'secret123' }); return { token: 'l' }; } }
  } as never);
  let res = responseDouble();
  await controller.register({ body: { username: 'a', email: 'a@a.com', password: 'secret123' } } as unknown as Request, res);
  assert.equal(res.statusCode, 201);
  res = responseDouble();
  await controller.login({ body: { identifier: 'a', password: 'secret123' } } as unknown as Request, res);
  assert.equal(res.statusCode, 200);
});

test('AuthController normalizes non-object request bodies', async () => {
  const calls: unknown[] = [];
  const controller = new AuthController({
    registerUseCase: { async execute(input: unknown) { calls.push(input); return {}; } },
    loginUseCase: { async execute(input: unknown) { calls.push(input); return {}; } }
  } as never);
  await controller.register({ body: null } as unknown as Request, responseDouble());
  await controller.login({ body: [] } as unknown as Request, responseDouble());
  assert.deepEqual(calls, [{}, {}]);
});

test('AuthController maps semantic error codes to HTTP responses', async () => {
  const codedError = (message: string, code?: string) => { const e = new Error(message); if (code) (e as Error & { code?: string }).code = code; return e; };
  const errors = [
    [codedError('Credenciales inválidas', 'UNAUTHORIZED'), 401],
    [codedError('El usuario o email ya está registrado', 'CONFLICT'), 409],
    [codedError('El email no es válido', 'VALIDATION_ERROR'), 400],
    [codedError('unexpected database error'), 500]
  ];
  for (const [error, expectedStatus] of errors as Array<[Error, number]>) {
    const controller = new AuthController({
      registerUseCase: { async execute() { throw error; } },
      loginUseCase: { async execute() { throw error; } }
    } as never);
    const registerRes = responseDouble();
    await controller.register({ body: {} } as unknown as Request, registerRes);
    assert.equal(registerRes.statusCode, expectedStatus);
    const loginRes = responseDouble();
    await controller.login({ body: {} } as unknown as Request, loginRes);
    assert.equal(loginRes.statusCode, expectedStatus);
  }
});

test('UserService sanitizes users without exposing passwords', async () => {
  const service = new UserService({ userRepository: {} });
  assert.deepEqual(service._sanitizeUser({ id: 'u1', password: 'secret', username: 'alice' } as never), { id: 'u1', username: 'alice' });
  assert.deepEqual(service._sanitizeUser({ toJSON: () => ({ id: 'u2', password: 'secret', username: 'bob' }) } as never), { id: 'u2', username: 'bob' });
  assert.equal(service._sanitizeUser(null), null);
});

test('JWT middleware rejects missing and malformed authorization headers', () => {
  for (const authorization of [undefined, 'Basic abc', 'Bearer', 'Bearer a b']) {
    const res = responseDouble();
    verifyToken({ headers: { authorization } } as unknown as Request, res, (() => assert.fail('next should not run')) as NextFunction);
    assert.equal(res.statusCode, 401);
  }
});

test('JWT middleware rejects expired tokens', () => {
  const expiredRes = responseDouble();
  const expired = jwt.sign({ userId: 'u1' }, 'test-secret', { expiresIn: -1 });
  verifyToken({ headers: { authorization: `Bearer ${expired}` } } as unknown as Request, expiredRes, (() => {}) as NextFunction);
  assert.equal(expiredRes.statusCode, 401);
});

test('database rejects unsupported lookup fields before touching PostgreSQL', async () => {
  await assert.rejects(getUserByField('password', 'secret'), /Campo inválido/);
});
