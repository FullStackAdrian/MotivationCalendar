/**
 * Caso de uso: Login de usuario
 * Orquesta el proceso de autenticación validando credenciales
 */

const UserService = require('../services/user.service');
const AuthPresenter = require('../presenters/auth.presenter');

class LoginUserUseCase {
  /**
   * @param {UserService} userService - Servicio de usuarios
   * @param {AuthPresenter} presenter - Presentador para formatear respuesta
   */
  constructor(userService = new UserService(), presenter = new AuthPresenter()) {
    this.userService = userService;
    this.presenter = presenter;
  }

  /**
   * Ejecuta el caso de uso de login
   * @param {Object} params - Parámetros de entrada
   * @param {string} params.identifier - Username o email
   * @param {string} params.password - Contraseña en texto plano
   * @returns {Promise<Object>} Resultado formateado con datos del usuario y token
   * @throws {Error} Si las credenciales son inválidas
   */
  async execute({ identifier, password }) {
    // Validación de entrada
    this._validateInput({ identifier, password });

    // Buscar usuario
    const user = await this.userService.findByUsernameOrEmail(identifier, identifier);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar contraseña
    const isValidPassword = await this.userService.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    // Generar token JWT
    const token = this.userService.generateToken(user);

    // Formatear respuesta usando el presentador
    return this.presenter.presentLogin(user, token);
  }

  /**
   * Valida los parámetros de entrada
   * @param {Object} params - Parámetros a validar
   * @private
   */
  _validateInput({ identifier, password }) {
    if (!identifier || !password) {
      throw new Error('Usuario/email y contraseña son requeridos');
    }

    if (typeof identifier !== 'string' || identifier.trim().length === 0) {
      throw new Error('El identificador es inválido');
    }

    if (typeof password !== 'string' || password.length === 0) {
      throw new Error('La contraseña es requerida');
    }
  }
}

module.exports = LoginUserUseCase;
