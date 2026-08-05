/**
 * Caso de uso: Login de usuario (Frontend)
 * Orquesta el proceso de login coordinando servicio y presentador
 */

class LoginUserUseCase {
  /**
   * @param {ApiService} apiService - Servicio de API
   * @param {AuthPresenter} presenter - Presentador para formatear datos
   */
  constructor(apiService = window.apiService, presenter = null) {
    this.apiService = apiService;
    this.presenter = presenter;
  }

  /**
   * Ejecuta el caso de uso de login
   * @param {string} identifier - Username o email
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} Resultado del login
   * @throws {Error} Si hay errores en la autenticación
   */
  async execute(identifier, password) {
    try {
      // Llamar al servicio de API
      const response = await this.apiService.login(identifier, password);
      
      // Formatear respuesta si hay presentador
      if (this.presenter) {
        return this.presenter.presentLoginResponse(response);
      }
      
      return response;
    } catch (error) {
      console.error('Error en LoginUserUseCase:', error);
      throw error;
    }
  }
}

window.LoginUserUseCase = LoginUserUseCase;
