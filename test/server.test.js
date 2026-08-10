const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

test('Express application can be constructed', () => {
  const app = require('../backend/server');
  assert.equal(typeof app, 'function');
});
