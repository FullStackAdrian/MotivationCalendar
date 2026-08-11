const test = require('node:test');
const assert = require('node:assert/strict');
const LoginUserUseCase = require('../backend/usecases/login-user.usecase');
const presenter = { presentLogin: (user, token) => ({ user, token }) };

test('login validates identifier and password types', async () => {
  const useCase = new LoginUserUseCase({}, presenter);
  for (const input of [{ identifier: '', password: 'x' }, { identifier: '   ', password: 'x' }, { identifier: 1, password: 'x' }, { identifier: 'alice', password: '' }, { identifier: 'alice', password: 1 }]) {
    await assert.rejects(useCase.execute(input));
  }
});

test('login rejects unknown users and bad passwords', async () => {
  const missing = new LoginUserUseCase({ async findByUsernameOrEmail() { return null; } }, presenter);
  await assert.rejects(missing.execute({ identifier: 'alice', password: 'secret123' }), /Credenciales inválidas/);
  const wrong = new LoginUserUseCase({ async findByUsernameOrEmail() { return { password: 'hash' }; }, async verifyPassword() { return false; } }, presenter);
  await assert.rejects(wrong.execute({ identifier: 'alice', password: 'secret123' }), /Credenciales inválidas/);
});

test('login verifies password, generates token and presents user', async () => {
  let verified = false;
  const service = {
    async findByUsernameOrEmail(id) { assert.equal(id, 'alice'); return { id: 'u1', username: 'alice', password: 'hash' }; },
    async verifyPassword(password, hash) { verified = true; assert.equal(password, 'secret123'); assert.equal(hash, 'hash'); return true; },
    generateToken(user) { assert.equal(user.id, 'u1'); return 'token'; }
  };
  const result = await new LoginUserUseCase(service, presenter).execute({ identifier: 'alice', password: 'secret123' });
  assert.equal(verified, true); assert.equal(result.token, 'token');
});
