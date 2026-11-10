import '../helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

import { seedDemo } from '../../scripts/seed-demo';
import { getUserProgress } from '../../backend/infrastructure/models/database';
import { initializeDatabase, closeDatabase } from '../../backend/infrastructure/models/database';

const tag = `seed_${Date.now()}`;

test.before(async () => {
  await initializeDatabase();
});

test.after(async () => {
  await closeDatabase().catch(() => {});
});

test('seed is a no-op without SEED_DEMO=true', async () => {
  delete process.env.SEED_DEMO;
  const result = await seedDemo({ emailPrefix: `${tag}_off` });
  assert.equal(result.skipped, true);
});

test('seed creates the demo user and board idempotently', async () => {
  process.env.SEED_DEMO = 'true';
  try {
    const first = await seedDemo({ emailPrefix: tag });
    assert.equal(first.skipped, false);
    assert.ok(first.user.id);
    assert.ok(first.board.id);

    const second = await seedDemo({ emailPrefix: tag });
    assert.equal(second.user.id, first.user.id);
    assert.equal(second.board.id, first.board.id);
    assert.equal(second.created, false);

    const progress = await getUserProgress(first.user.id);
    assert.deepEqual(progress, {});
  } finally {
    delete process.env.SEED_DEMO;
  }
});
