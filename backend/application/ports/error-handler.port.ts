/**
 * Puerto del middleware de gestión de errores.
 * Implementación: application/middlewares/error-handler.middleware.ts.
 */
export type ErrorCode = 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'CONFLICT' | 'INTERNAL_ERROR';

export interface ApplicationError extends Error {
  code?: ErrorCode;
}

export interface ErrorHandlerPort {
  /** Ejecuta la operación bajo protección y normaliza cualquier fallo. */
  run<T>(operation: () => Promise<T>): Promise<T>;
}
