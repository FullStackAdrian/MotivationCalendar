/**
 * Registro de usuario (Frontend)
 * Orquesta el proceso de registro coordinando servicio y presentador
 */

class RegisterUserUseCase {
  /**
   * @param {ApiService} apiService - Servicio de API
   * @param {AuthPresenter} presenter - Presentador para formatear datos
   */
  constructor(apiService = window.apiService, presenter = null) {
    this.apiService = apiService;
    this.presenter = presenter;
  }

  /**
   * Ejecuta el caso de uso de registro
   * @param {string} username - Nombre de usuario
   * @param {string} email - Email
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} Resultado del registro
   * @throws {Error} Si hay errores en el registro
   */
  async execute(username, email, password) {
    try {
      // Validaciones básicas
      this._validateInput(username, email, password);
      
      // Llamar al servicio de API
      const response = await this.apiService.register(username, email, password);
      
      // Formatear respuesta si hay presentador
      if (this.presenter) {
        return this.presenter.presentRegisterResponse(response);
      }
      
      return response;
    } catch (error) {
      console.error('Error en RegisterUserUseCase:', error);
      throw error;
    }
  }

  /**
   * Valida los parámetros de entrada
   * @param {string} username - Nombre de usuario
   * @param {string} email - Email
   * @param {string} password - Contraseña
   * @private
   */
  _validateInput(username, email, password) {
    if (!username || !email || !password) {
      throw new Error('Todos los campos son requeridos');
    }

    if (username.trim().length === 0) {
      throw new Error('El nombre de usuario es inválido');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('El email es inválido');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
  }
}

window.RegisterUserUseCase = RegisterUserUseCase;
