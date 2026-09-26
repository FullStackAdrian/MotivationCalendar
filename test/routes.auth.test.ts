import './helpers/test-env';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import authRoutes from '../backend/infrastructure/routes/auth';
import { closeDatabase } from '../backend/infrastructure/models/database';

// El flujo de login abre el pool de conexiones aunque no haya PostgreSQL:
// hay que cerrarlo para que el proceso de test pueda terminar.
test.after(async () => {
  await closeDatabase().catch(() => {});
});

function start(): Promise<Server> {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  return new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
}

test('authentication router exposes register and login endpoints', async () => {
  const s = await start();
  const port = (s.address() as AddressInfo).port;
  const r = await fetch(`http://127.0.0.1:${port}/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'x', email: 'bad', password: 'x' }) });
  assert.ok([400, 409, 500].includes(r.status));
  const l = await fetch(`http://127.0.0.1:${port}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: 'missing', password: 'x' }) });
  assert.equal(l.status, 401);
  await new Promise((resolve) => s.close(resolve));
});

test('authentication router returns 404 for unrelated methods', async () => {
  const s = await start();
  const r = await fetch(`http://127.0.0.1:${(s.address() as AddressInfo).port}/auth/unknown`);
  assert.equal(r.status, 404);
  await new Promise((resolve) => s.close(resolve));
});
