import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

interface LoadResult {
  status: number;
  stdout: string;
  stderr: string;
}

function load(env: Record<string, string>): LoadResult {
  const code = `
    for (const key of ['NODE_ENV', 'JWT_SECRET', 'PORT', 'JWT_EXPIRES_IN', 'ALLOWED_ORIGINS']) delete process.env[key];
    ${Object.entries(env).map(([key, value]) => `process.env.${key} = ${JSON.stringify(value)};`).join('\n')}
    try {
      console.log(JSON.stringify(require('./backend/infrastructure/config/config').config));
    } catch (error) {
      console.error(error.message);
      process.exit(2);
    }
  `;
  // El config ahora es TypeScript: el proceso hijo carga tsx como loader.
  return spawnSync(process.execPath, ['--import', 'tsx', '-e', code], {
    cwd: process.cwd(),
    encoding: 'utf8'
  }) as LoadResult;
}

test('config uses safe defaults', () => {
  const result = load({ JWT_SECRET: 'test-secret', NODE_ENV: 'test' });
  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
  assert.equal(parsed.port, 3000);
  assert.equal(parsed.jwtExpiresIn, '30d');
  assert.deepEqual(parsed.allowedOrigins, [
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
  const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
  assert.equal(parsed.port, 4321);
  assert.equal(parsed.jwtExpiresIn, '2h');
  assert.deepEqual(parsed.allowedOrigins, ['https://a.test', 'https://b.test']);
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
