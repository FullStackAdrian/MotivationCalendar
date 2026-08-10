/**
 * Middleware de autenticación JWT.
 */
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No se proporcionó token de autenticación' });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token || authHeader.split(' ').length !== 2) {
    return res.status(401).json({ error: 'Formato de token inválido' });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = { verifyToken };
