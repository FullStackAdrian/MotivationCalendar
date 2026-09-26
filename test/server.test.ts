import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import app from '../backend/server';

test('Express application can be constructed', () => {
  assert.equal(typeof app, 'function');
});
