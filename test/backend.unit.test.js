const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const AuthController = require('../backend/controllers/auth.controller');
const AuthPresenter = require('../backend/presenters/auth.presenter');
const UserService = require('../backend/services/user.service');
const { verifyToken } = require('../backend/middleware/auth');
const { getUserByField } = require('../backend/models/database');

function responseDouble() {
  return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('AuthPresenter formats registration and login responses without passwords', () => {
  const presenter = new AuthPresenter();
  const user = { id: 'u1', username: 'alice', email: 'alice@example.com', password: 'secret', createdAt: '2026-01-01' };
  assert.deepEqual(presenter.presentRegistration(user, 'token'), { message: 'Usuario registrado exitosamente', token: 'token', user: { id: 'u1', username: 'alice', email: 'alice@example.com', createdAt: '2026-01-01' } });
  assert.equal(presenter.presentLogin({ ...user, createdAt: undefined }, 'token2').user.createdAt, null);
});

test('AuthController returns success responses', async () => {
  const controller = new AuthController(
    { async execute(input) { assert.deepEqual(input, { username: 'a', email: 'a@a.com', password: 'secret123' }); return { token: 'r' }; } },
    { async execute(input) { assert.deepEqual(input, { identifier: 'a', password: 'secret123' }); return { token: 'l' }; } }
  );
  let res = responseDouble();
  await controller.register({ body: { username: 'a', email: 'a@a.com', password: 'secret123' } }, res);
  assert.equal(res.statusCode, 201);
  res = responseDouble();
  await controller.login({ body: { identifier: 'a', password: 'secret123' } }, res);
  assert.equal(res.statusCode, 200);
});

test('AuthController normalizes non-object request bodies', async () => {
  const calls = [];
  const controller = new AuthController({ async execute(input) { calls.push(input); return {}; } }, { async execute(input) { calls.push(input); return {}; } });
  await controller.register({ body: null }, responseDouble());
  await controller.login({ body: [] }, responseDouble());
  assert.deepEqual(calls, [{ username: undefined, email: undefined, password: undefined }, { identifier: undefined, password: undefined }]);
});

test('AuthController maps domain errors to HTTP responses', async () => {
  const errors = [['Credenciales inválidas', 401], ['El usuario o email ya está registrado', 409], ['Todos los campos son requeridos', 400], ['El email es inválido', 400], ['La contraseña debe tener entre 6 y 72 caracteres', 400], ['El nombre de usuario debe tener entre 3 y 50 caracteres', 400], ['El email no puede superar 255 caracteres', 400], ['El identificador es inválido', 400], ['La contraseña es requerida', 400], ['unexpected database error', 500]];
  for (const [message, expectedStatus] of errors) {
    const controller = new AuthController({ async execute() { throw new Error(message); } }, { async execute() { throw new Error(message); } });
    const registerRes = responseDouble();
    await controller.register({ body: {} }, registerRes);
    assert.equal(registerRes.statusCode, expectedStatus);
    const loginRes = responseDouble();
    await controller.login({ body: {} }, loginRes);
    assert.equal(loginRes.statusCode, expectedStatus);
  }
});

test('UserService verifies passwords, creates tokens and sanitizes users', async () => {
  const service = new UserService();
  const hash = await bcrypt.hash('secret123', 4);
  assert.equal(await service.verifyPassword('secret123', hash), true);
  assert.equal(await service.verifyPassword('wrong', hash), false);
  const token = service.generateToken({ id: 'u1', username: 'alice' });
  assert.equal(jwt.verify(token, 'test-secret').userId, 'u1');
  assert.deepEqual(service._sanitizeUser({ id: 'u1', password: 'secret', username: 'alice' }), { id: 'u1', username: 'alice' });
  assert.deepEqual(service._sanitizeUser({ toJSON: () => ({ id: 'u2', password: 'secret', username: 'bob' }) }), { id: 'u2', username: 'bob' });
  assert.equal(service._sanitizeUser(null), null);
});

test('JWT middleware rejects missing and malformed authorization headers', () => {
  for (const authorization of [undefined, 'Basic abc', 'Bearer', 'Bearer a b']) {
    const res = responseDouble();
    verifyToken({ headers: { authorization } }, res, () => assert.fail('next should not run'));
    assert.equal(res.statusCode, 401);
  }
});

test('JWT middleware accepts valid tokens and rejects invalid and expired tokens', () => {
  const valid = jwt.sign({ userId: 'u1', username: 'alice' }, 'test-secret');
  let nextCalled = false;
  const req = { headers: { authorization: `Bearer ${valid}` } };
  verifyToken(req, responseDouble(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user.userId, 'u1');
  const invalidRes = responseDouble();
  verifyToken({ headers: { authorization: 'Bearer invalid' } }, invalidRes, () => {});
  assert.equal(invalidRes.statusCode, 401);
  const expiredRes = responseDouble();
  const expired = jwt.sign({ userId: 'u1' }, 'test-secret', { expiresIn: -1 });
  verifyToken({ headers: { authorization: `Bearer ${expired}` } }, expiredRes, () => {});
  assert.equal(expiredRes.statusCode, 401);
});

test('database rejects unsupported lookup fields before touching PostgreSQL', async () => {
  await assert.rejects(getUserByField('password', 'secret'), /Campo inválido/);
});