/**
 * Presentador para respuestas de autenticación
 * Transforma los datos internos en formatos adecuados para la API response
 */

class AuthPresenter {
  /**
   * Formatea la respuesta de registro
   * @param {Object} user - Usuario creado
   * @param {string} token - Token JWT
   * @returns {Object} Respuesta formateada para el cliente
   */
  presentRegistration(user, token) {
    return {
      message: 'Usuario registrado exitosamente',
      token,
      user: this._presentUser(user)
    };
  }

  /**
   * Formatea la respuesta de login
   * @param {Object} user - Usuario autenticado
   * @param {string} token - Token JWT
   * @returns {Object} Respuesta formateada para el cliente
   */
  presentLogin(user, token) {
    return {
      message: 'Login exitoso',
      token,
      user: this._presentUser(user)
    };
  }

  /**
   * Formatea un objeto de usuario para la respuesta
   * @param {Object} user - Usuario interno
   * @returns {Object} Usuario formateado
   * @private
   */
  _presentUser(user) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt || null
    };
  }
}

module.exports = AuthPresenter;
