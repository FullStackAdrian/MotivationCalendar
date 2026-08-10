/**
 * Configuración del servidor.
 * Centraliza y valida las variables de entorno.
 */

const parseAllowedOrigins = (value) => {
  if (!value) {
    return ['http://localhost:3000', 'http://127.0.0.1:3000'];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET no está configurado');
}

if (process.env.NODE_ENV === 'production' && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
}

const config = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS)
};

module.exports = config;
