/**
 * Augmentación de tipos de Express para el pipeline de autenticación.
 */
import type { TokenPayload } from '../../application/ports/token-provider.port';

declare global {
  namespace Express {
    interface Request {
      /** Payload del JWT cuando verifyToken ha pasado. */
      user?: TokenPayload;
    }
  }
}

export {};
