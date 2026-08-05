/**
 * Servicio de usuarios
 * Maneja la lógica de negocio relacionada con usuarios: creación, búsqueda, autenticación
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { 
  createUser, 
  findUserByIdentifier, 
  findUserByEmail,
  getUserByField 
} = require('../models/database');

class UserService {
  /**
   * Busca un usuario por username o email
   * @param {string} usernameOrEmail - Username o email a buscar
   * @returns {Promise<Object|null>} Usuario encontrado o null
   */
  async findByUsernameOrEmail(usernameOrEmail, email) {
    // Intentar buscar por username primero
    let user = await this._findUser(usernameOrEmail);
    
    // Si no se encuentra y el parámetro parece un email, buscar por email
    if (!user && email) {
      user = await this._findUserByEmail(email);
    }
    
    return user;
  }

  /**
   * Crea un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @param {string} userData.username - Nombre de usuario
   * @param {string} userData.email - Email
   * @param {string} userData.password - Contraseña en texto plano
   * @returns {Promise<Object>} Usuario creado (sin password)
   */
  async createUser({ username, email, password }) {
    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear usuario en la base de datos
    const user = createUser(username, email, hashedPassword);
    
    // Retornar usuario sin password
    return this._sanitizeUser(user);
  }

  /**
   * Verifica una contraseña contra un hash
   * @param {string} password - Contraseña en texto plano
   * @param {string} hashedPassword - Hash de la contraseña
   * @returns {Promise<boolean>} True si coincide
   */
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Genera un token JWT para un usuario
   * @param {Object} user - Usuario
   * @returns {string} Token JWT
   */
  generateToken(user) {
    return jwt.sign(
      { userId: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
  }

  /**
   * Busca un usuario en la base de datos
   * @param {string} identifier - Username o email
   * @returns {Promise<Object|null>} Usuario encontrado o null
   * @private
   */
  async _findUser(identifier) {
    return findUserByIdentifier(identifier);
  }

  /**
   * Busca un usuario por email
   * @param {string} email - Email del usuario
   * @returns {Promise<Object|null>} Usuario encontrado o null
   * @private
   */
  async _findUserByEmail(email) {
    return findUserByEmail(email);
  }

  /**
   * Elimina información sensible del usuario
   * @param {Object} user - Usuario completo
   * @returns {Object} Usuario sin información sensible
   * @private
   */
  _sanitizeUser(user) {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

module.exports = UserService;
