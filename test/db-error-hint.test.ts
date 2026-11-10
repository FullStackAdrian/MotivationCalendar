import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDatabaseError } from '../backend/infrastructure/models/database';

// A.5.5: si Postgres no está (ECONNREFUSED 5432), el error debe decir qué hacer.
test('formatDatabaseError añade el hint test:db:up ante ECONNREFUSED (A.5.5)', () => {
  const err = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
    code: 'ECONNREFUSED'
  });
  const formatted = formatDatabaseError(err);
  assert.match(formatted.message, /npm run test:db:up/);
  assert.match(formatted.message, /ECONNREFUSED/);
});

test('formatDatabaseError no oculta el mensaje original (A.5.5)', () => {
  const err = new Error('ConnectionAcquireTimeoutError: pool agotado');
  const formatted = formatDatabaseError(err);
  assert.match(formatted.message, /pool agotado/);
});
