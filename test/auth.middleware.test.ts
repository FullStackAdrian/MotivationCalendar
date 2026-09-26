import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

import { verifyToken } from '../backend/infrastructure/middleware/auth';

function resDouble(): Response {
  return {
    code: 200,
    body: null,
    status(c: number) { this.code = c; return this; },
    json(b: unknown) { this.body = b; return this; }
  } as unknown as Response;
}

test('middleware rejects all malformed authorization forms', () => {
  for (const authorization of [undefined, '', 'Basic abc', 'Bearer', 'Bearer a b', 'bearer abc']) {
    const r = resDouble();
    verifyToken({ headers: { authorization } } as unknown as Request, r, (() => assert.fail()) as NextFunction);
    assert.equal(r.code, 401);
  }
});

test('middleware accepts valid bearer token', () => {
  const token = jwt.sign({ userId: 'u1', username: 'a' }, 'test-secret');
  const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
  let next = false;
  verifyToken(req, resDouble(), (() => { next = true; }) as NextFunction);
  assert.equal(next, true);
  assert.equal(req.user?.userId, 'u1');
});

test('middleware distinguishes invalid and expired JWTs', () => {
  let r = resDouble();
  verifyToken({ headers: { authorization: 'Bearer invalid' } } as unknown as Request, r, (() => {}) as NextFunction);
  assert.equal(r.body.error, 'Token inválido');
  r = resDouble();
  const token = jwt.sign({ userId: 'u' }, 'test-secret', { expiresIn: -1 });
  verifyToken({ headers: { authorization: `Bearer ${token}` } } as unknown as Request, r, (() => {}) as NextFunction);
  assert.equal(r.body.error, 'Token expirado');
});
