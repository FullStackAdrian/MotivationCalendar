import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Puerto fijo libre: config.ts hace `Number(PORT) || 3000`, así que '0' no sirve.
import './helpers/test-server-env';
import { startServer } from '../backend/server';
import { closeDatabase } from '../backend/infrastructure/models/database';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function stubExit(): { restore: () => void; waitForExit: () => Promise<number | undefined>; calls: () => number } {
  const originalExit = process.exit;
  let calls = 0;
  let resolveExit: (code: number | undefined) => void = () => {};
  const seen = new Promise<number | undefined>((resolve) => { resolveExit = resolve; });
  const timer = setTimeout(() => resolveExit(undefined), 10000);
  process.exit = ((code?: number) => {
    calls += 1;
    clearTimeout(timer);
    resolveExit(code);
    return undefined as never;
  }) as never;
  return {
    restore: () => { process.exit = originalExit; },
    waitForExit: () => seen,
    calls: () => calls
  };
}

test('SIGTERM triggers a single graceful shutdown with exit code 0', async () => {
  const exit = stubExit();
  try {
    await startServer();
    // SIGINT y SIGTERM comparten el mismo cierre: con una señal basta para
    // cubrirlo; la segunda emisión verifica el guard `shuttingDown`.
    process.emit('SIGTERM');
    process.emit('SIGTERM');
    assert.equal(await exit.waitForExit(), 0);
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.equal(exit.calls(), 1);
  } finally {
    exit.restore();
  }
});

test('CLI reports startup failures with exit code 1', async () => {
  const { spawnSync } = require('node:child_process') as typeof import('node:child_process');
  const result = spawnSync(process.execPath, ['--import=tsx', 'backend/server.ts'], {
    encoding: 'utf8',
    timeout: 60000,
    env: {
      ...process.env,
      JWT_SECRET: 'test-secret',
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:59999/motivation_calendar_test'
    }
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No se pudo iniciar el servidor/);
});

test.after(async () => {
  await closeDatabase().catch(() => {});
});
