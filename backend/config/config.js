require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambia-en-produccion',
  TOKEN_EXPIRATION: '30d'
};
