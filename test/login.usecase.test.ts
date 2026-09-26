import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LoginUserUseCase } from '../backend/application/usecases/login-user.usecase';
import { ValidationMiddleware } from '../backend/application/middlewares/validation.middleware';
import { ErrorHandlerMiddleware } from '../backend/application/middlewares/error-handler.middleware';

const presenter = { presentLogin: (user: unknown, token: string) => ({ user, token }) };

function buildDeps(overrides = {}) {
  return {
    userService: { async findByUsernameOrEmail() { return null; } },
    presenter,
    passwordHasher: {
      async compare(password: string, hash: string) { return password === 'secret123' && hash === 'hash'; }
    },
    tokenProvider: { generate() { return 'jwt'; }, verify() { throw new Error('no'); } },
    validator: new ValidationMiddleware(),
    errorHandler: new ErrorHandlerMiddleware(),
    ...overrides
  };
}

test('login validates identifier and password before touching services', async () => {
  let called = false;
  const deps = buildDeps({ userService: { async findByUsernameOrEmail() { called = true; } } });
  const useCase = new LoginUserUseCase(deps);
  for (const input of [{ identifier: '', password: 'x' }, { identifier: '   ', password: 'x' }, { identifier: 1, password: 'x' }, { identifier: 'alice', password: '' }, { identifier: 'alice', password: 1 }, [1, 2]]) {
    await assert.rejects(useCase.execute(input), /obligatori|Datos de entrada inválidos/);
  }
  assert.equal(called, false);
});

test('login rejects unknown users and bad passwords', async () => {
  const missing = new LoginUserUseCase(buildDeps());
  await assert.rejects(missing.execute({ identifier: 'alice', password: 'secret123' }), /Credenciales inválidas/);

  const wrong = new LoginUserUseCase(buildDeps({
    userService: { async findByUsernameOrEmail() { return { id: 'u1', username: 'alice', password: 'hash' }; } }
  }));
  await assert.rejects(wrong.execute({ identifier: 'alice', password: 'wrong-password' }), /Credenciales inválidas/);
});

test('login verifies password via hasher, generates token and presents user', async () => {
  let compared = false;
  const deps = buildDeps({
    userService: {
      async findByUsernameOrEmail(id: unknown) { assert.equal(id, 'alice'); return { id: 'u1', username: 'alice', password: 'hash' }; }
    },
    passwordHasher: {
      async compare(password: string, hash: string) { compared = true; assert.equal(password, 'secret123'); assert.equal(hash, 'hash'); return true; }
    },
    tokenProvider: { generate(user: { id: string }) { assert.equal(user.id, 'u1'); return 'token'; }, verify() { throw new Error('no'); } }
  });
  const result = await new LoginUserUseCase(deps).execute({ identifier: 'alice', password: 'secret123' });
  assert.equal(compared, true);
  assert.equal(result.token, 'token');
});

test('credential failures carry the UNAUTHORIZED code', async () => {
  const useCase = new LoginUserUseCase(buildDeps());
  await assert.rejects(useCase.execute({ identifier: 'ghost', password: 'secret123' }), (error: { code?: string }) => error.code === 'UNAUTHORIZED');
});
