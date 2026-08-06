/**
 * Caso de uso: Registro de usuario
 * Orquesta el proceso de registro validando datos y coordinando con el servicio
 */

const UserService = require('../services/user.service');
const AuthPresenter = require('../presenters/auth.presenter');

class RegisterUserUseCase {
  /**
   * @param {UserService} userService - Servicio de usuarios
   * @param {AuthPresenter} presenter - Presentador para formatear respuesta
   */
  constructor(userService = new UserService(), presenter = new AuthPresenter()) {
    this.userService = userService;
    this.presenter = presenter;
  }

  /**
   * Ejecuta el caso de uso de registro
   * @param {Object} params - Parámetros de entrada
   * @param {string} params.username - Nombre de usuario
   * @param {string} params.email - Email del usuario
   * @param {string} params.password - Contraseña en texto plano
   * @returns {Promise<Object>} Resultado formateado con datos del usuario y token
   * @throws {Error} Si hay errores en la validación o registro
   */
  async execute({ username, email, password }) {
    // Validación de entrada
    this._validateInput({ username, email, password });

    // Verificar si el usuario ya existe (ahora solo pasa un parámetro)
    const existingUser = await this.userService.findByUsernameOrEmail(username);
    if (existingUser) {
      throw new Error('El usuario o email ya está registrado');
    }

    // Registrar usuario
    const user = await this.userService.createUser({ username, email, password });

    // Generar token JWT
    const token = this.userService.generateToken(user);

    // Formatear respuesta usando el presentador
    return this.presenter.presentRegistration(user, token);
  }

  /**
   * Valida los parámetros de entrada
   * @param {Object} params - Parámetros a validar
   * @private
   */
  _validateInput({ username, email, password }) {
    if (!username || !email || !password) {
      throw new Error('Todos los campos son requeridos');
    }

    if (typeof username !== 'string' || username.trim().length === 0) {
      throw new Error('El nombre de usuario es inválido');
    }

    if (typeof email !== 'string' || !this._isValidEmail(email)) {
      throw new Error('El email es inválido');
    }

    if (typeof password !== 'string' || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
  }

  /**
   * Valida el formato de un email
   * @param {string} email - Email a validar
   * @returns {boolean} True si es válido
   * @private
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = RegisterUserUseCase;
