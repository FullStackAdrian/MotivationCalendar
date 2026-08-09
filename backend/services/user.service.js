/**
 * Servicio de usuarios.
 * Encapsula hashing, búsqueda y autenticación de usuarios.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const {
  createUser,
  findUserByIdentifier,
  findUserByEmail
} = require('../models/database');

class UserService {
  async findByUsernameOrEmail(identifier, email) {
    const user = await findUserByIdentifier(identifier);

    if (user) {
      return user;
    }

    // Backwards-compatible optional second lookup, useful for registration.
    return email ? findUserByEmail(email) : null;
  }

  async createUser({ username, email, password }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(username, email, hashedPassword);
    return this._sanitizeUser(user);
  }

  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  generateToken(user) {
    return jwt.sign(
      { userId: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
  }

  async _findUser(identifier) {
    return findUserByIdentifier(identifier);
  }

  async _findUserByEmail(email) {
    return findUserByEmail(email);
  }

  _sanitizeUser(user) {
    if (!user) return null;

    const plainUser = typeof user.toJSON === 'function' ? user.toJSON() : user;
    const { password, ...sanitizedUser } = plainUser;
    return sanitizedUser;
  }
}

module.exports = UserService;
