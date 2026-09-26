import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RegisterUserUseCase } from '../backend/application/usecases/register-user.usecase';
import { ValidationMiddleware } from '../backend/application/middlewares/validation.middleware';
import { ErrorHandlerMiddleware } from '../backend/application/middlewares/error-handler.middleware';

const presenter = { presentRegistration: (user: unknown, token: string) => ({ user, token }) };
const valid = { username: ' alice ', email: ' ALICE@EXAMPLE.COM ', password: 'secret123' };

function buildDeps(overrides = {}) {
  return {
    userService: {
      async findByUsernameOrEmail() { return null; },
      async createUser() { return {}; }
    },
    presenter,
    passwordHasher: { async hash(password: string) { return `hashed:${password}`; } },
    tokenProvider: { generate() { return 'jwt'; }, verify() { throw new Error('no'); } },
    validator: new ValidationMiddleware(),
    errorHandler: new ErrorHandlerMiddleware(),
    ...overrides
  };
}

test('register validates input, hashes password and returns presentation', async () => {
  let findArgs: unknown[];
  let createArgs: Record<string, unknown>;
  const deps = buildDeps({
    userService: {
      async findByUsernameOrEmail(...args: unknown[]) { findArgs = args; return null; },
      async createUser(data: Record<string, unknown>) { createArgs = data; return { id: 'u1', ...data }; }
    }
  });
  const result = await new RegisterUserUseCase(deps).execute(valid);
  assert.deepEqual(findArgs!, ['alice', 'alice@example.com']);
  assert.deepEqual(createArgs!, { username: 'alice', email: 'alice@example.com', passwordHash: 'hashed:secret123' });
  assert.equal(result.token, 'jwt');
});

test('register stops before persistence for every validation family', async () => {
  let called = false;
  const deps = buildDeps({ userService: { async findByUsernameOrEmail() { called = true; } } });
  const useCase = new RegisterUserUseCase(deps);
  const cases = [
    [{ username: 1, email: 'a@b.com', password: 'secret123' }, /obligatorio/],
    [{ username: 'ab', email: 'a@b.com', password: 'secret123' }, /entre 3 y 50/],
    [{ username: 'alice', email: 'invalid', password: 'secret123' }, /email no es válido/],
    [{ username: 'alice', email: 'a@b.com', password: '12345' }, /entre 6 y 72/],
    [{ username: 'alice', email: `${'a'.repeat(256)}@b.com`, password: 'secret123' }, /no puede superar/],
    [null, /Datos de entrada inválidos/]
  ];
  for (const [input, expected] of cases as Array<[unknown, RegExp]>) await assert.rejects(useCase.execute(input), expected);
  assert.equal(called, false);
});

test('validation errors carry the semantic code', async () => {
  const useCase = new RegisterUserUseCase(buildDeps());
  await assert.rejects(useCase.execute({ username: 'ab' }), (error: { code?: string }) => error.code === 'VALIDATION_ERROR');
});

test('register rejects duplicates before creating a user', async () => {
  let created = false;
  const deps = buildDeps({
    userService: {
      async findByUsernameOrEmail() { return { id: 'existing' }; },
      async createUser() { created = true; }
    }
  });
  await assert.rejects(new RegisterUserUseCase(deps).execute(valid), /ya está registrado/);
  assert.equal(created, false);
});

test('business errors carry semantic codes via the error middleware', async () => {
  const deps = buildDeps({ userService: { async findByUsernameOrEmail() { return { id: 'existing' }; } } });
  await assert.rejects(new RegisterUserUseCase(deps).execute(valid), (error: { code?: string }) => error.code === 'CONFLICT');
});
