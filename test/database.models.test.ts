import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserModel, ProgressModel, getUserByField } from '../backend/infrastructure/models/database';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function stringLength(attribute: { type: unknown }): number {
  return (attribute.type as unknown as { options: { length: number } }).options.length;
}

test('database models expose required schema and constraints', () => {
  assert.equal(UserModel.getTableName(), 'users');
  assert.equal(ProgressModel.getTableName(), 'progress');
  assert.equal(UserModel.rawAttributes.username.allowNull, false);
  assert.equal(stringLength(UserModel.rawAttributes.username as { type: unknown }), 50);
  assert.equal(stringLength(UserModel.rawAttributes.email as { type: unknown }), 255);
  assert.equal(stringLength(ProgressModel.rawAttributes.dayKey as { type: unknown }), 10);
  const statusValidate = ProgressModel.rawAttributes.status.validate as { isIn: [string[]] } | undefined;
  assert.deepEqual(statusValidate?.isIn[0], ['completed', 'partial', 'failed']);
});

test('database model validators reject invalid user and progress data without PostgreSQL', async () => {
  const user = UserModel.build({ username: 'ab', email: 'invalid', password: 'x' });
  await assert.rejects(user.validate());
  const progress = ProgressModel.build({ userId: 'u', dayKey: '2026-01-01', status: 'unknown' as never });
  await assert.rejects(progress.validate());
});

test('database rejects unknown user lookup fields', async () => {
  await assert.rejects(getUserByField('password', 'x'), /Campo inválido/);
});

