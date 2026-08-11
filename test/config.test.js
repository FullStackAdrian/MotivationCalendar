const test = require('node:test');
const assert = require('node:assert/strict');

function load(env) {
  const keys = ['JWT_SECRET', 'NODE_ENV', 'PORT', 'JWT_EXPIRES_IN', 'ALLOWED_ORIGINS'];
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, env);
  delete require.cache[require.resolve('../backend/config/config')];
  return require('../backend/config/config');
}

test('config uses safe defaults', () => {
  const config = load({ JWT_SECRET: 'test-secret', NODE_ENV: 'test' });
  assert.equal(config.port, 3000);
  assert.equal(config.jwtExpiresIn, '30d');
  assert.deepEqual(config.allowedOrigins, ['http://localhost:3000', 'http://127.0.0.1:3000']);
});

test('config parses origins, port and expiration', () => {
  const config = load({ JWT_SECRET: 'secret', NODE_ENV: 'test', PORT: '4321', JWT_EXPIRES_IN: '2h', ALLOWED_ORIGINS: ' https://a.test, ,https://b.test ' });
  assert.equal(config.port, 4321);
  assert.equal(config.jwtExpiresIn, '2h');
  assert.deepEqual(config.allowedOrigins, ['https://a.test', 'https://b.test']);
});

test('config rejects missing JWT secret', () => {
  assert.throws(() => load({ NODE_ENV: 'test' }), /JWT_SECRET no está configurado/);
});

test('config rejects short production JWT secrets', () => {
  assert.throws(() => load({ NODE_ENV: 'production', JWT_SECRET: 'short' }), /al menos 32 caracteres/);
});
