/**
 * Configuración del servidor
 * Centraliza las variables de entorno y configuración global
 */

const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambia-en-produccion',
  jwtExpiresIn: '30d',
  nodeEnv: process.env.NODE_ENV || 'development'
};

module.exports = config;
