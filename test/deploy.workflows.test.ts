import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string): string => readFileSync(join(root, path), 'utf8');

test('compose allows localhost and 127.0.0.1 origins for web and api', () => {
  const compose = read('docker-compose.yml');
  const allowedLine = compose.split('\n').find((line) => line.includes('ALLOWED_ORIGINS:'));
  assert.ok(allowedLine, 'docker-compose.yml misses ALLOWED_ORIGINS');
  for (const origin of [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:',
    'http://127.0.0.1:'
  ]) {
    assert.ok(allowedLine.includes(origin), `ALLOWED_ORIGINS misses ${origin}`);
  }
});

test('backend deploy artifact compiles and ships dist', () => {
  for (const workflow of ['.github/workflows/deploy.yml', '.github/workflows/deploy-pages.yml']) {
    const content = read(workflow);
    assert.ok(content.includes('setup-node'), `${workflow} misses Node setup`);
    assert.ok(content.includes('npm run build'), `${workflow} misses backend build`);
    assert.ok(
      /backend\/dist/.test(content),
      `${workflow} must package backend/dist instead of raw .ts sources`
    );
  }
});

test('pages export injects the public api url and validates it', () => {
  const content = read('.github/workflows/deploy-pages.yml');
  assert.ok(content.includes('EXPO_PUBLIC_API_URL'), 'pages export misses EXPO_PUBLIC_API_URL');
  assert.ok(content.includes('secrets.EXPO_PUBLIC_API_URL'), 'api url must come from secrets');
  assert.ok(content.includes('localhost'), 'pages export must validate no localhost leak');
});

test('node 22 is pinned everywhere', () => {
  for (const file of [
    'backend/Dockerfile',
    'frontend/Dockerfile',
    '.github/workflows/ci.yml',
    '.github/workflows/deploy.yml',
    '.github/workflows/deploy-pages.yml'
  ]) {
    const content = read(file);
    assert.ok(!content.includes('node:20'), `${file} still pins node 20`);
    assert.ok(!content.includes("NODE_VERSION: '20'"), `${file} still pins NODE_VERSION 20`);
  }
  assert.ok(read('backend/Dockerfile').includes('node:22-alpine'), 'backend must build on node 22');
});
