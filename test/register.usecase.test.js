const test = require('node:test');
const assert = require('node:assert/strict');
const RegisterUserUseCase = require('../backend/usecases/register-user.usecase');

const presenter = { presentRegistration: (user, token) => ({ user, token }) };
const valid = { username: ' alice ', email: ' ALICE@EXAMPLE.COM ', password: 'secret123' };

test('register normalizes input and returns presentation', async () => {
  let args;
  const service = {
    async findByUsernameOrEmail(username, email) { args = ['find', username, email]; return null; },
    async createUser(data) { args = ['create', data]; return { id: 'u1', ...data }; },
    generateToken() { return 'jwt'; }
  };
  const result = await new RegisterUserUseCase(service, presenter).execute(valid);
  assert.deepEqual(args, ['create', { username: 'alice', email: 'alice@example.com', password: 'secret123' }]);
  assert.equal(result.token, 'jwt');
});

test('register stops before persistence for every validation family', async () => {
  const useCase = new RegisterUserUseCase({}, presenter);
  const cases = [
    [{ username: 1, email: 'a@b.com', password: 'secret123' }, 'Todos los campos'],
    [{ username: 'ab', email: 'a@b.com', password: 'secret123' }, 'entre 3 y 50'],
    [{ username: 'alice', email: 'invalid', password: 'secret123' }, 'email es inválido'],
    [{ username: 'alice', email: 'a@b.com', password: '12345' }, 'entre 6 y 72'],
    [{ username: 'alice', email: 'a'.repeat(256) + '@b.com', password: 'secret123' }, 'no puede superar']
  ];
  for (const [input, message] of cases) await assert.rejects(useCase.execute(input), new RegExp(message));
});

test('register rejects duplicates before creating a user', async () => {
  const service = { async findByUsernameOrEmail() { return { id: 'existing' }; }, async createUser() { assert.fail(); } };
  await assert.rejects(new RegisterUserUseCase(service, presenter).execute({ username: 'alice', email: 'a@b.com', password: 'secret123' }), /ya está registrado/);
});
