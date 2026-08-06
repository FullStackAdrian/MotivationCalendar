/**
 * Configuración del servidor
 * Centraliza las variables de entorno y configuración global
 */

// Validar que JWT_SECRET esté configurado
if (!process.env.JWT_SECRET) {
  throw new Error('❌ ERROR: JWT_SECRET no está configurado. Define la variable de entorno JWT_SECRET en tu archivo .env');
}

const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '30d',
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://127.0.0.1:3000']
};

module.exports = config;
