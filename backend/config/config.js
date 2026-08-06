/**
 * Configuración del servidor
 * Centraliza las variables de entorno y configuración global
 */

// Validar que JWT_SECRET esté configurado en producción
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET no está configurado. Usa un valor seguro en producción.');
}

const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambia-en-produccion',
  jwtExpiresIn: '30d',
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://127.0.0.1:3000']
};

module.exports = config;
