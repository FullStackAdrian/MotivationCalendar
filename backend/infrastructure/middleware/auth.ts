/**
 * Middleware de autenticación JWT para Express.
 * Delega la verificación criptográfica en el TokenProvider
 * (única fuente de verdad JWT del sistema).
 */
import type { NextFunction, Request, Response } from 'express';
import { TokenProvider } from '../security/token-provider';

const tokenProvider = new TokenProvider();

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'No se proporcionó token de autenticación' });
    return;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token || authHeader.split(' ').length !== 2) {
    res.status(401).json({ error: 'Formato de token inválido' });
    return;
  }

  try {
    req.user = tokenProvider.verify(token);
    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expirado' });
      return;
    }
    res.status(401).json({ error: 'Token inválido' });
  }
};
