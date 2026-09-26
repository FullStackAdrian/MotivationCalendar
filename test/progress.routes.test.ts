import './helpers/test-env';
import type { AddressInfo } from 'node:http';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express, { type Express } from 'express';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

import progress from '../backend/infrastructure/routes/progress';

function app(): Express {
  const application = express();
  application.use(express.json());
  application.use('/progress', progress);
  return application;
}

async function request(method: string, path: string, body?: unknown): Promise<Response> {
  const server = app().listen(0);
  try {
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const options: RequestInit = {
      method,
      headers: { 'content-type': 'application/json' }
    };
    if (body !== undefined) (options as { body?: string }).body = JSON.stringify(body);
    return await fetch(base + path, options);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('progress endpoints require authentication', async () => {
  const cases: Array<[string, string, unknown?]> = [
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
  const cases: Array<[string, string, unknown?]> = [
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
