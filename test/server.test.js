const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

// Requiring the app must not start a listening server or throw while registering routes.
test('Express application can be constructed', () => {
  const app = require('../backend/server');
  assert.equal(typeof app, 'function');
});
