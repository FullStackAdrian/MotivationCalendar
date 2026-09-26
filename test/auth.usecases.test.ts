import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

import { RegisterUserUseCase } from '../backend/application/usecases/register-user.usecase';
import { LoginUserUseCase } from '../backend/application/usecases/login-user.usecase';
import { ValidationMiddleware } from '../backend/application/middlewares/validation.middleware';
import { ErrorHandlerMiddleware } from '../backend/application/middlewares/error-handler.middleware';

const presenter = {
  presentRegistration(user: unknown, token: string) { return { user, token }; },
  presentLogin(user: unknown, token: string) { return { user, token }; }
};

function buildDeps(overrides = {}) {
  return {
    userService: { async findByUsernameOrEmail() { return null; } },
    presenter,
    passwordHasher: { async hash(password: string) { return `hashed:${password}`; } },
    tokenProvider: { generate() { return 'token'; }, verify() { throw new Error('no'); } },
    validator: new ValidationMiddleware(),
    errorHandler: new ErrorHandlerMiddleware(),
    ...overrides
  };
}

test('register creates a user with hashed password and awaits persistence', async () => {
  let created;
  const deps = buildDeps({
    userService: {
      async findByUsernameOrEmail(username: unknown, email: unknown) {
        assert.equal(username, 'adrian');
        assert.equal(email, 'adrian@example.com');
        return null;
      },
      async createUser(data) {
        created = data;
        return { id: 'user-1', username: data.username, email: data.email };
      }
    }
  });

  const useCase = new RegisterUserUseCase(deps);
  const result = await useCase.execute({ username: ' adrian ', email: 'ADRIAN@EXAMPLE.COM', password: 'secret123' });

  assert.deepEqual(created, { username: 'adrian', email: 'adrian@example.com', passwordHash: 'hashed:secret123' });
  assert.equal(result.token, 'token');
});

test('register rejects an existing username or email', async () => {
  const deps = buildDeps({ userService: { async findByUsernameOrEmail() { return { id: 'existing' }; } } });
  const useCase = new RegisterUserUseCase(deps);
  await assert.rejects(useCase.execute({ username: 'adrian', email: 'adrian@example.com', password: 'secret123' }), { message: 'El usuario o email ya está registrado' });
});

test('register rejects non-string fields without throwing a TypeError', async () => {
  const useCase = new RegisterUserUseCase(buildDeps());
  await assert.rejects(useCase.execute({ username: {}, email: 'adrian@example.com', password: 'secret123' }), { message: 'El nombre de usuario es obligatorio' });
});

test('register rejects empty fields', async () => {
  const useCase = new RegisterUserUseCase(buildDeps());
  await assert.rejects(useCase.execute({ username: '  ', email: 'a@example.com', password: 'secret123' }), { message: 'El nombre de usuario debe tener entre 3 y 50 caracteres' });
  await assert.rejects(useCase.execute({ username: 'adrian', email: '  ', password: 'secret123' }), { message: 'El email no es válido' });
  await assert.rejects(useCase.execute({ username: 'adrian', email: 'a@example.com', password: '' }), { message: 'La contraseña debe tener entre 6 y 72 caracteres' });
});

test('register validates username length', async () => {
  const useCase = new RegisterUserUseCase(buildDeps());
  await assert.rejects(useCase.execute({ username: 'ab', email: 'a@example.com', password: 'secret123' }), { message: 'El nombre de usuario debe tener entre 3 y 50 caracteres' });
  await assert.rejects(useCase.execute({ username: 'a'.repeat(51), email: 'a@example.com', password: 'secret123' }), { message: 'El nombre de usuario debe tener entre 3 y 50 caracteres' });
});

test('register validates email and maximum email length', async () => {
  const useCase = new RegisterUserUseCase(buildDeps());
  await assert.rejects(useCase.execute({ username: 'adrian', email: 'invalid-email', password: 'secret123' }), { message: 'El email no es válido' });
  await assert.rejects(useCase.execute({ username: 'adrian', email: `${'a'.repeat(250)}@x.com`, password: 'secret123' }), { message: 'El email no puede superar 255 caracteres' });
});

test('register rejects passwords longer than bcrypt supports', async () => {
  const useCase = new RegisterUserUseCase(buildDeps());
  await assert.rejects(useCase.execute({ username: 'adrian', email: 'adrian@example.com', password: 'a'.repeat(73) }), { message: 'La contraseña debe tener entre 6 y 72 caracteres' });
});

test('login rejects invalid credentials', async () => {
  const useCase = new LoginUserUseCase(buildDeps());
  await assert.rejects(useCase.execute({ identifier: 'missing', password: 'secret123' }), { message: 'Credenciales inválidas' });
});

test('login rejects missing and invalid input', async () => {
  const useCase = new LoginUserUseCase(buildDeps());
  await assert.rejects(useCase.execute({ identifier: '', password: 'secret123' }), { message: 'El identificador es obligatorio' });
  await assert.rejects(useCase.execute({ identifier: 'alice' }), { message: 'La contraseña es obligatoria' });
  await assert.rejects(useCase.execute({ identifier: 123, password: 'secret123' }), { message: 'El identificador es obligatorio' });
  await assert.rejects(useCase.execute({ identifier: '   ', password: 'secret123' }), { message: 'El identificador es obligatorio' });
  await assert.rejects(useCase.execute({ identifier: 'alice', password: '' }), { message: 'La contraseña es obligatoria' });
  await assert.rejects(useCase.execute({ identifier: 'alice', password: 123 }), { message: 'La contraseña es obligatoria' });
});

test('login rejects a wrong password', async () => {
  const deps = buildDeps({
    userService: { async findByUsernameOrEmail() { return { id: 'user-1', password: 'hash' }; } },
    passwordHasher: { async compare() { return false; } }
  });
  const useCase = new LoginUserUseCase(deps);
  await assert.rejects(useCase.execute({ identifier: 'alice', password: 'secret123' }), { message: 'Credenciales inválidas' });
});

test('login verifies the password before issuing a token', async () => {
  const deps = buildDeps({
    userService: {
      async findByUsernameOrEmail(identifier: unknown) { assert.equal(identifier, 'adrian@example.com'); return { id: 'user-1', username: 'adrian', password: 'hash' }; }
    },
    passwordHasher: { async compare(password: string, hash: string) { assert.equal(password, 'secret123'); assert.equal(hash, 'hash'); return true; } },
    tokenProvider: { generate(user: { id: string }) { assert.equal(user.id, 'user-1'); return 'token'; }, verify() { throw new Error('no'); } }
  });
  const useCase = new LoginUserUseCase(deps);
  const result = await useCase.execute({ identifier: 'adrian@example.com', password: 'secret123' });
  assert.equal(result.token, 'token');
});
