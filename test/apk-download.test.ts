import './helpers/test-env';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

import app from '../backend/server';

type ListenServer = ReturnType<typeof app.listen>;

function baseOf(server: ListenServer): string {
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

test('GET /downloads/motivation-calendar.apk devuelve 404 JSON cuando no hay APK publicado', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'apk-missing-'));
  const previous = process.env.APK_PATH;
  process.env.APK_PATH = join(dir, 'no-existe.apk');
  const server: ListenServer = app.listen(0);
  try {
    const r = await fetch(`${baseOf(server)}/downloads/motivation-calendar.apk`);
    assert.equal(r.status, 404);
    assert.match(r.headers.get('content-type') ?? '', /application\/json/);
    const body = (await r.json()) as { error: string };
    assert.match(body.error, /APK/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previous === undefined) delete process.env.APK_PATH;
    else process.env.APK_PATH = previous;
  }
});

test('GET /downloads/motivation-calendar.apk sirve el APK con cabeceras de descarga', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'apk-present-'));
  const apkPath = join(dir, 'motivation-calendar.apk');
  writeFileSync(apkPath, Buffer.from('fake-apk-bytes'));
  const previous = process.env.APK_PATH;
  process.env.APK_PATH = apkPath;
  const server: ListenServer = app.listen(0);
  try {
    const r = await fetch(`${baseOf(server)}/downloads/motivation-calendar.apk`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') ?? '', /android\.package-archive/);
    assert.match(r.headers.get('content-disposition') ?? '', /attachment/);
    const buf = Buffer.from(await r.arrayBuffer());
    assert.equal(buf.toString(), 'fake-apk-bytes');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previous === undefined) delete process.env.APK_PATH;
    else process.env.APK_PATH = previous;
  }
});

test('resolveApkPath usa backend/downloads por defecto', async () => {
  const mod = await import('../backend/infrastructure/routes/downloads');
  const previous = process.env.APK_PATH;
  delete process.env.APK_PATH;
  try {
    const p = mod.resolveApkPath();
    assert.ok(p.endsWith('backend/downloads/motivation-calendar.apk'), p);
  } finally {
    if (previous === undefined) delete process.env.APK_PATH;
    else process.env.APK_PATH = previous;
  }
});
test('GET /api/downloads/info incluye la versión publicada y disponibilidad del APK', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'apk-info-version-'));
  const apkPath = join(dir, 'motivation-calendar.apk');
  writeFileSync(apkPath, Buffer.from('fake-apk-bytes'));
  const previous = process.env.APK_PATH;
  process.env.APK_PATH = apkPath;
  const server: ListenServer = app.listen(0);
  try {
    const r = await fetch(`${baseOf(server)}/api/downloads/info`);
    assert.equal(r.status, 200);
    const body = (await r.json()) as {
      apkUrl: string;
      fileName: string;
      version: string;
      available: boolean;
      sizeBytes: number | null;
      updatedAt: string | null;
    };
    assert.equal(body.apkUrl, '/downloads/motivation-calendar.apk');
    assert.equal(body.fileName, 'motivation-calendar.apk');
    assert.match(body.version, /^\d+\.\d+\.\d+/);
    assert.equal(body.available, true);
    assert.equal(body.sizeBytes, Buffer.byteLength('fake-apk-bytes'));
    assert.ok(body.updatedAt !== null && !Number.isNaN(Date.parse(body.updatedAt)), body.updatedAt);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previous === undefined) delete process.env.APK_PATH;
    else process.env.APK_PATH = previous;
  }
});

test('GET /api/downloads/info marca available=false cuando no hay APK publicado', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'apk-info-missing-'));
  const previous = process.env.APK_PATH;
  process.env.APK_PATH = join(dir, 'no-existe.apk');
  const server: ListenServer = app.listen(0);
  try {
    const r = await fetch(`${baseOf(server)}/api/downloads/info`);
    assert.equal(r.status, 200);
    const body = (await r.json()) as {
      version: string;
      available: boolean;
      sizeBytes: number | null;
      updatedAt: string | null;
    };
    assert.match(body.version, /^\d+\.\d+\.\d+/);
    assert.equal(body.available, false);
    assert.equal(body.sizeBytes, null);
    assert.equal(body.updatedAt, null);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previous === undefined) delete process.env.APK_PATH;
    else process.env.APK_PATH = previous;
  }
});

test('GET /api/downloads/info respeta APP_VERSION cuando está definida', async () => {
  const previous = process.env.APP_VERSION;
  process.env.APP_VERSION = '9.9.9';
  const server: ListenServer = app.listen(0);
  try {
    const r = await fetch(`${baseOf(server)}/api/downloads/info`);
    assert.equal(r.status, 200);
    const body = (await r.json()) as { version: string };
    assert.equal(body.version, '9.9.9');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previous === undefined) delete process.env.APP_VERSION;
    else process.env.APP_VERSION = previous;
  }
});
