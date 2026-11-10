import './helpers/test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loginUserSchema } from '../backend/application/schemas/login-user.schema';
import { registerUserSchema } from '../backend/application/schemas/register-user.schema';

test('login schema trims the identifier and requires both fields', () => {
  const parsed = loginUserSchema.safeParse({ identifier: '  Alice@Example.com ', password: 'secret123' });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.identifier, 'Alice@Example.com');

  for (const input of [
    { identifier: '', password: 'secret123' },
    { identifier: '   ', password: 'secret123' },
    { identifier: 'alice', password: '' },
    { identifier: 'alice' },
    { password: 'secret123' },
    { identifier: 42, password: 'secret123' }
  ]) {
    const result = loginUserSchema.safeParse(input);
    assert.equal(result.success, false);
    if (!result.success) assert.ok(result.error.issues.length > 0);
  }
});

test('login schema reports the custom required messages', () => {
  const result = loginUserSchema.safeParse({ identifier: '', password: '' });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(
      result.error.issues.map((issue) => issue.message),
      ['El identificador es obligatorio', 'La contraseña es obligatoria']
    );
  }
});

test('register schema trims and lowercases before validating', () => {
  const parsed = registerUserSchema.safeParse({
    username: '  Alice  ',
    email: '  ALICE@Example.COM ',
    password: 'secret123'
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.username, 'Alice');
    assert.equal(parsed.data.email, 'alice@example.com');
  }
});

test('register schema rejects short/long usernames and bad emails', () => {
  assert.equal(registerUserSchema.safeParse({ username: 'ab', email: 'a@b.com', password: 'secret123' }).success, false);
  assert.equal(registerUserSchema.safeParse({ username: 'a'.repeat(51), email: 'a@b.com', password: 'secret123' }).success, false);
  assert.equal(registerUserSchema.safeParse({ username: 'alice', email: 'not-an-email', password: 'secret123' }).success, false);
  assert.equal(registerUserSchema.safeParse({ username: 'alice', email: `a@${'b'.repeat(250)}.com`, password: 'secret123' }).success, false);
  const emailError = registerUserSchema.safeParse({ username: 'alice', email: 'bad', password: 'secret123' });
  assert.equal(emailError.success, false);
  if (!emailError.success) assert.ok(emailError.error.issues.some((issue) => issue.message === 'El email no es válido'));
});

test('register schema enforces the password length window', () => {
  assert.equal(registerUserSchema.safeParse({ username: 'alice', email: 'a@b.com', password: '12345' }).success, false);
  assert.equal(registerUserSchema.safeParse({ username: 'alice', email: 'a@b.com', password: 'x'.repeat(73) }).success, false);
  assert.equal(registerUserSchema.safeParse({ username: 'alice', email: 'a@b.com', password: '123456' }).success, true);
  const missing = registerUserSchema.safeParse({ username: 'alice', email: 'a@b.com' });
  assert.equal(missing.success, false);
  if (!missing.success) assert.ok(missing.error.issues.some((issue) => issue.message === 'La contraseña es obligatoria'));
});
