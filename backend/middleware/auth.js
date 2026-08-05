/**
 * Middleware de autenticación JWT
 * Verifica y valida los tokens de acceso
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Verifica que el request tenga un token JWT válido
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Siguiente middleware
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No se proporcionó token de autenticación' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Formato de token inválido' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(403).json({ error: 'Token inválido' });
  }
};

module.exports = { verifyToken };
