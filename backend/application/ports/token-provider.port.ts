/**
 * Puerto de emisión/verificación de tokens.
 * Implementación: infrastructure/security/token-provider.ts (jsonwebtoken).
 */
export interface TokenPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface TokenSubject {
  id: string;
  username: string;
}

export interface TokenProviderPort {
  generate(user: TokenSubject): string;
  verify(token: string): TokenPayload;
}
