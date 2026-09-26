/**
 * Middleware de validación de entradas.
 * Orquestado por los usecases antes de invocar a los servicios de dominio.
 * Encapsula zod: si cambia la librería, solo se toca este archivo.
 */
import { ZodType } from 'zod';

export class ValidationError extends Error {
  readonly code: 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
  }
}

export class ValidationMiddleware {
  /**
   * Valida la entrada contra un esquema zod.
   * @returns Los datos parseados y normalizados por el esquema.
   * @throws {ValidationError} Si la entrada no cumple el contrato.
   */
  validate<T>(schema: ZodType<T>, input: unknown): T {
    if (!(schema instanceof ZodType)) {
      throw new TypeError('Se requiere un esquema zod válido');
    }
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new ValidationError('Datos de entrada inválidos');
    }

    const result = schema.safeParse(input);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new ValidationError(issue ? issue.message : 'Datos de entrada inválidos');
    }
    return result.data;
  }
}
