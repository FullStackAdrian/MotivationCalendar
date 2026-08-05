/**
 * Presentador para autenticación en frontend
 * Transforma datos de la API para la vista
 */

class AuthPresenter {
  /**
   * Formatea la respuesta de login para la vista
   * @param {Object} response - Respuesta de la API
   * @returns {Object} Datos formateados para la UI
   */
  presentLoginResponse(response) {
    return {
      success: true,
      user: {
        id: response.user?.id,
        username: response.user?.username,
        email: response.user?.email
      },
      token: response.token,
      message: response.message || 'Login exitoso'
    };
  }

  /**
   * Formatea la respuesta de registro para la vista
   * @param {Object} response - Respuesta de la API
   * @returns {Object} Datos formateados para la UI
   */
  presentRegisterResponse(response) {
    return {
      success: true,
      user: {
        id: response.user?.id,
        username: response.user?.username,
        email: response.user?.email
      },
      token: response.token,
      message: response.message || 'Registro exitoso'
    };
  }

  /**
   * Formatea un error de autenticación para mostrar en la UI
   * @param {Error} error - Error capturado
   * @returns {Object} Error formateado
   */
  presentAuthError(error) {
    return {
      success: false,
      message: error.message || 'Error de autenticación',
      error: error
    };
  }
}

window.AuthPresenter = AuthPresenter;
