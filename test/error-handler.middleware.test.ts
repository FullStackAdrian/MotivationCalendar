import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ErrorHandlerMiddleware } from '../backend/application/middlewares/error-handler.middleware';
import { ValidationError } from '../backend/application/middlewares/validation.middleware';

test('run returns the operation result untouched on success', async () => {
  const handler = new ErrorHandlerMiddleware();
  const result = await handler.run(async () => ({ ok: true }));
  assert.deepEqual(result, { ok: true });
});

test('validation errors keep their semantic code', async () => {
  const handler = new ErrorHandlerMiddleware();
  await assert.rejects(handler.run(async () => { throw new ValidationError('El email no es válido'); }), (error: { code?: string; message?: string }) => {
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.equal(error.message, 'El email no es válido');
    return true;
  });
});

test('known business errors map to catalog codes', async () => {
  const handler = new ErrorHandlerMiddleware();

  await assert.rejects(handler.run(async () => { throw new Error('Credenciales inválidas'); }), (error: { code?: string }) => error.code === 'UNAUTHORIZED');

  await assert.rejects(handler.run(async () => { throw new Error('El usuario o email ya está registrado'); }), (error: { code?: string }) => error.code === 'CONFLICT');
});

test('unknown errors are classified as internal without changing their message', async () => {
  const handler = new ErrorHandlerMiddleware();
  await assert.rejects(handler.run(async () => { throw new Error('db connection refused'); }), (error: { code?: string; message?: string }) => {
    assert.equal(error.code, 'INTERNAL_ERROR');
    assert.equal(error.message, 'db connection refused');
    return true;
  });
});

test('non-Error throws are normalized into internal errors', async () => {
  const handler = new ErrorHandlerMiddleware();
  await assert.rejects(handler.run(async () => { throw 'boom'; }), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal((error as { code?: string }).code, 'INTERNAL_ERROR');
    assert.equal((error as Error).message, 'Error interno del servidor');
    return true;
  });
});
