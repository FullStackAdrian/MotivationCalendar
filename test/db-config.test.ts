import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sequelize } from '../backend/infrastructure/models/database';

// A.5.4: la suite unit no puede esperar 30s por operación sin BD.
test('pool acquire es fail-fast en entorno test (A.5.4)', () => {
  const pool = sequelize.options.pool as { acquire?: number } | undefined;
  assert.ok(pool?.acquire !== undefined, 'pool.acquire debe estar definido');
  assert.ok(
    (pool?.acquire as number) <= 5000,
    `pool.acquire=${pool?.acquire}ms: en test debe ser <=5000ms para fallar rápido sin BD`
  );
});

test('reintentos desactivados o mínimos en entorno test (A.5.4)', () => {
  const retry = sequelize.options.retry as { max?: number } | undefined;
  if (retry?.max !== undefined) {
    assert.ok(retry.max <= 1, `retry.max=${retry.max}: en test debe ser <=1`);
  }
});
