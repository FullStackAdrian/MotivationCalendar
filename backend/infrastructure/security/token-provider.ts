/**
 * Adaptador de tokens JWT.
 * Único punto del sistema que firma y verifica jsonwebtoken.
 * Implementa el puerto TokenProviderPort de application.
 */
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import type { TokenPayload, TokenProviderPort, TokenSubject } from '../../application/ports/token-provider.port';

export class TokenProvider implements TokenProviderPort {
  generate(user: TokenSubject): string {
    return jwt.sign(
      { userId: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
    );
  }

  verify(token: string): TokenPayload {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  }
}
