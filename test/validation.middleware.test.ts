import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { ValidationMiddleware, ValidationError } from '../backend/application/middlewares/validation.middleware';

const schema = z.object({
  name: z.string({ message: 'El nombre es obligatorio' }).trim().min(2, 'El nombre es demasiado corto'),
  email: z.string({ message: 'El email es obligatorio' }).trim().toLowerCase()
});

test('validate returns parsed data with transforms applied', () => {
  const middleware = new ValidationMiddleware();
  const result = middleware.validate(schema, { name: '  alice ', email: ' A@B.COM ' });
  assert.deepEqual(result, { name: 'alice', email: 'a@b.com' });
});

test('validate throws ValidationError with the first issue message', () => {
  const middleware = new ValidationMiddleware();
  assert.throws(() => middleware.validate(schema, { name: 'a', email: 'a@b.com' }), (error: unknown) => {
    assert.ok(error instanceof ValidationError);
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.equal(error.message, 'El nombre es demasiado corto');
    return true;
  });
});

test('validate rejects non-object inputs deterministically', () => {
  const middleware = new ValidationMiddleware();
  for (const input of [null, undefined, [], 'text', 42]) {
    assert.throws(() => middleware.validate(schema, input), (error: unknown) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.message, 'Datos de entrada inválidos');
      return true;
    });
  }
});

test('validate requires a real zod schema', () => {
  const middleware = new ValidationMiddleware();
  assert.throws(() => middleware.validate({} as never, {}), TypeError);
});
