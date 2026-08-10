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

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET no está configurado');
}

const config = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS)
};

module.exports = config;
