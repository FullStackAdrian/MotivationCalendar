const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const RegisterUserUseCase = require('../backend/usecases/register-user.usecase');
const LoginUserUseCase = require('../backend/usecases/login-user.usecase');

const presenter = {
  presentRegistration(user, token) { return { user, token }; },
  presentLogin(user, token) { return { user, token }; }
};

test('register creates a user and awaits persistence', async () => {
  let created;
  const service = {
    async findByUsernameOrEmail(username, email) {
      assert.equal(username, 'adrian');
      assert.equal(email, 'adrian@example.com');
      return null;
    },
    async createUser(data) {
      created = data;
      return { id: 'user-1', username: data.username, email: data.email };
    },
    generateToken(user) {
      assert.equal(user.id, 'user-1');
      return 'token';
    }
  };

  const useCase = new RegisterUserUseCase(service, presenter);
  const result = await useCase.execute({ username: ' adrian ', email: 'ADRIAN@EXAMPLE.COM', password: 'secret123' });

  assert.deepEqual(created, { username: 'adrian', email: 'adrian@example.com', password: 'secret123' });
  assert.equal(result.token, 'token');
});

test('register rejects an existing username or email', async () => {
  const service = { async findByUsernameOrEmail() { return { id: 'existing' }; } };
  const useCase = new RegisterUserUseCase(service, presenter);
  await assert.rejects(useCase.execute({ username: 'adrian', email: 'adrian@example.com', password: 'secret123' }), { message: 'El usuario o email ya está registrado' });
});

test('register rejects non-string fields without throwing a TypeError', async () => {
  const useCase = new RegisterUserUseCase({}, presenter);
  await assert.rejects(useCase.execute({ username: { trim() {} }, email: 'adrian@example.com', password: 'secret123' }), { message: 'Todos los campos son requeridos' });
});

test('register rejects empty fields', async () => {
  const useCase = new RegisterUserUseCase({}, presenter);
  await assert.rejects(useCase.execute({ username: '  ', email: 'a@example.com', password: 'secret123' }), { message: 'Todos los campos son requeridos' });
  await assert.rejects(useCase.execute({ username: 'adrian', email: '  ', password: 'secret123' }), { message: 'Todos los campos son requeridos' });
  await assert.rejects(useCase.execute({ username: 'adrian', email: 'a@example.com', password: '' }), { message: 'Todos los campos son requeridos' });
});

test('register validates username length', async () => {
  const useCase = new RegisterUserUseCase({}, presenter);
  await assert.rejects(useCase.execute({ username: 'ab', email: 'a@example.com', password: 'secret123' }), { message: 'El nombre de usuario debe tener entre 3 y 50 caracteres' });
  await assert.rejects(useCase.execute({ username: 'a'.repeat(51), email: 'a@example.com', password: 'secret123' }), { message: 'El nombre de usuario debe tener entre 3 y 50 caracteres' });
});

test('register validates email and maximum email length', async () => {
  const useCase = new RegisterUserUseCase({}, presenter);
  await assert.rejects(useCase.execute({ username: 'adrian', email: 'invalid-email', password: 'secret123' }), { message: 'El email es inválido' });
  await assert.rejects(useCase.execute({ username: 'adrian', email: `${'a'.repeat(250)}@x.com`, password: 'secret123' }), { message: 'El email no puede superar 255 caracteres' });
});

test('register rejects passwords longer than bcrypt supports', async () => {
  const useCase = new RegisterUserUseCase({}, presenter);
  await assert.rejects(useCase.execute({ username: 'adrian', email: 'adrian@example.com', password: 'a'.repeat(73) }), { message: 'La contraseña debe tener entre 6 y 72 caracteres' });
});

test('login rejects invalid credentials', async () => {
  const service = { async findByUsernameOrEmail() { return null; } };
  const useCase = new LoginUserUseCase(service, presenter);
  await assert.rejects(useCase.execute({ identifier: 'missing', password: 'secret123' }), { message: 'Credenciales inválidas' });
});

test('login rejects missing and invalid input', async () => {
  const useCase = new LoginUserUseCase({}, presenter);
  await assert.rejects(useCase.execute({ identifier: '', password: 'secret123' }), { message: 'Usuario/email y contraseña son requeridos' });
  await assert.rejects(useCase.execute({ identifier: 'alice' }), { message: 'Usuario/email y contraseña son requeridos' });
  await assert.rejects(useCase.execute({ identifier: 123, password: 'secret123' }), { message: 'El identificador es inválido' });
  await assert.rejects(useCase.execute({ identifier: '   ', password: 'secret123' }), { message: 'El identificador es inválido' });
  await assert.rejects(useCase.execute({ identifier: 'alice', password: '' }), { message: 'Usuario/email y contraseña son requeridos' });
  await assert.rejects(useCase.execute({ identifier: 'alice', password: 123 }), { message: 'La contraseña es requerida' });
});

test('login rejects a wrong password', async () => {
  const service = {
    async findByUsernameOrEmail() { return { id: 'user-1', password: 'hash' }; },
    async verifyPassword() { return false; }
  };
  const useCase = new LoginUserUseCase(service, presenter);
  await assert.rejects(useCase.execute({ identifier: 'alice', password: 'secret123' }), { message: 'Credenciales inválidas' });
});

test('login verifies the password before issuing a token', async () => {
  const service = {
    async findByUsernameOrEmail(identifier) { assert.equal(identifier, 'adrian@example.com'); return { id: 'user-1', username: 'adrian', password: 'hash' }; },
    async verifyPassword(password, hash) { assert.equal(password, 'secret123'); assert.equal(hash, 'hash'); return true; },
    generateToken(user) { assert.equal(user.id, 'user-1'); return 'token'; }
  };
  const useCase = new LoginUserUseCase(service, presenter);
  const result = await useCase.execute({ identifier: 'adrian@example.com', password: 'secret123' });
  assert.equal(result.token, 'token');
});