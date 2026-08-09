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
  const result = await useCase.execute({
    username: ' adrian ',
    email: 'ADRIAN@EXAMPLE.COM',
    password: 'secret123'
  });

  assert.deepEqual(created, {
    username: 'adrian',
    email: 'adrian@example.com',
    password: 'secret123'
  });
  assert.equal(result.token, 'token');
});

test('register rejects an existing username or email', async () => {
  const service = {
    async findByUsernameOrEmail() { return { id: 'existing' }; }
  };

  const useCase = new RegisterUserUseCase(service, presenter);
  await assert.rejects(
    useCase.execute({ username: 'adrian', email: 'adrian@example.com', password: 'secret123' }),
    { message: 'El usuario o email ya está registrado' }
  );
});

test('login rejects invalid credentials', async () => {
  const service = {
    async findByUsernameOrEmail() { return null; }
  };

  const useCase = new LoginUserUseCase(service, presenter);
  await assert.rejects(
    useCase.execute({ identifier: 'missing', password: 'secret123' }),
    { message: 'Credenciales inválidas' }
  );
});

test('login verifies the password before issuing a token', async () => {
  const service = {
    async findByUsernameOrEmail(identifier) {
      assert.equal(identifier, 'adrian@example.com');
      return { id: 'user-1', username: 'adrian', password: 'hash' };
    },
    async verifyPassword(password, hash) {
      assert.equal(password, 'secret123');
      assert.equal(hash, 'hash');
      return true;
    },
    generateToken(user) {
      assert.equal(user.id, 'user-1');
      return 'token';
    }
  };

  const useCase = new LoginUserUseCase(service, presenter);
  const result = await useCase.execute({ identifier: 'adrian@example.com', password: 'secret123' });
  assert.equal(result.token, 'token');
});
