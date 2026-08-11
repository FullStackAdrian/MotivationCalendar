const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

function load(env) {
  const code = `
    for (const key of ['NODE_ENV', 'JWT_SECRET', 'PORT', 'JWT_EXPIRES_IN', 'ALLOWED_ORIGINS']) delete process.env[key];
    ${Object.entries(env).map(([key, value]) => `process.env.${key} = ${JSON.stringify(value)};`).join('\n')}
    try {
      console.log(JSON.stringify(require('./backend/config/config')));
    } catch (error) {
      console.error(error.message);
      process.exit(2);
    }
  `;
  return spawnSync(process.execPath, ['-e', code], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
}

test('config uses safe defaults', () => {
  const result = load({ JWT_SECRET: 'test-secret', NODE_ENV: 'test' });
  assert.equal(result.status, 0);
  const config = JSON.parse(result.stdout);
  assert.equal(config.port, 3000);
  assert.equal(config.jwtExpiresIn, '30d');
  assert.deepEqual(config.allowedOrigins, [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ]);
});

test('config parses origins, port and expiration', () => {
  const result = load({
    JWT_SECRET: 'secret',
    NODE_ENV: 'test',
    PORT: '4321',
    JWT_EXPIRES_IN: '2h',
    ALLOWED_ORIGINS: ' https://a.test, ,https://b.test '
  });
  assert.equal(result.status, 0);
  const config = JSON.parse(result.stdout);
  assert.equal(config.port, 4321);
  assert.equal(config.jwtExpiresIn, '2h');
  assert.deepEqual(config.allowedOrigins, ['https://a.test', 'https://b.test']);
});

test('config rejects missing JWT secret', () => {
  const result = load({ NODE_ENV: 'test' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /JWT_SECRET no está configurado/);
});

test('config rejects short production JWT secrets', () => {
  const result = load({ NODE_ENV: 'production', JWT_SECRET: 'short' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /al menos 32 caracteres/);
});
