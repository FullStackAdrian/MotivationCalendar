const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const progress = require('../backend/routes/progress');

function app() {
  const application = express();
  application.use(express.json());
  application.use('/progress', progress);
  return application;
}

async function request(method, path, body) {
  const server = app().listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const options = {
      method,
      headers: { 'content-type': 'application/json' }
    };
    if (body !== undefined) options.body = JSON.stringify(body);
    return await fetch(base + path, options);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('progress endpoints require authentication', async () => {
  const cases = [
    ['GET', '/progress'],
    ['PUT', '/progress/2026-01-01', { status: 'completed' }],
    ['POST', '/progress/bulk', { updates: {} }],
    ['DELETE', '/progress']
  ];

  for (const [method, path, body] of cases) {
    const response = await request(method, path, body);
    assert.equal(response.status, 401);
  }
});

test('progress router registers the complete public endpoint surface', async () => {
  const cases = [
    ['GET', '/progress'],
    ['PUT', '/progress/2026-01-01', { status: 'completed' }],
    ['POST', '/progress/bulk', { updates: {} }],
    ['DELETE', '/progress']
  ];

  for (const [method, path, body] of cases) {
    const response = await request(method, path, body);
    assert.notEqual(response.status, 404, `${method} ${path} must be registered`);
  }
});
