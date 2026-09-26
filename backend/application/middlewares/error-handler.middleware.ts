/**
 * Middleware de gestión de errores.
 * Envuelve la ejecución del caso de uso y clasifica cualquier fallo
 * en códigos semánticos independientes del transporte HTTP.
 */
import type { ApplicationError, ErrorHandlerPort, ErrorCode } from '../ports/error-handler.port';
import { ValidationError } from './validation.middleware';

/**
 * Catálogo de errores de negocio conocidos → código semántico.
 * Política de aplicación: vive junto al caso de uso que los lanza.
 */
export const ERROR_CATALOG: Readonly<Record<string, ErrorCode>> = {
  'Credenciales inválidas': 'UNAUTHORIZED',
  'El usuario o email ya está registrado': 'CONFLICT'
};

export class ErrorHandlerMiddleware implements ErrorHandlerPort {
  async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this._classify(error);
    }
  }

  private _classify(error: unknown): ApplicationError {
    if (error instanceof ValidationError) {
      return error;
    }
    if (error instanceof Error) {
      (error as ApplicationError).code = ERROR_CATALOG[error.message] ?? 'INTERNAL_ERROR';
      return error as ApplicationError;
    }
    const normalized: ApplicationError = new Error('Error interno del servidor');
    normalized.code = 'INTERNAL_ERROR';
    return normalized;
  }
}
