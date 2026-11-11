/**
 * Configuración del servidor.
 * Centraliza y valida las variables de entorno.
 */

export type NodeEnv = 'development' | 'test' | 'production';

function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) {
    return ['http://localhost:3000', 'http://127.0.0.1:3000'];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET no está configurado');
}

if (process.env.NODE_ENV === 'production' && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  nodeEnv: (process.env.NODE_ENV || 'development') as NodeEnv,
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  // BETA-1: anti fuerza-bruta en auth (10 intentos/15min por IP en dev/prod;
  // 100 en test para que la suite de integración no roce el límite).
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX) ||
    (process.env.NODE_ENV === 'test' ? 100 : 10),
  // BETA-1: nº de proxies de confianza delante del backend (nginx en compose).
  trustProxyHops: process.env.TRUST_PROXY_HOPS === undefined
    ? 1
    : Number(process.env.TRUST_PROXY_HOPS)
} as const;
