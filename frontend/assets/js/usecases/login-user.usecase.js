/**
 * Caso de uso: Iniciar Sesión
 * Encapsula la lógica de negocio para el login de usuario
 */

class LoginUserUseCase {
  /**
   * @param {AuthService} authService - Servicio de autenticación
   */
  constructor(authService) {
    this.authService = authService;
  }

  /**
   * Ejecuta el caso de uso de login
   * @param {Object} credentials - Credenciales del usuario
   * @param {string} credentials.identifier - Username o email
   * @param {string} credentials.password - Contraseña
   * @returns {Promise<Object>} Resultado del login
   * @throws {Error} Si las credenciales son inválidas
   */
  async execute({ identifier, password }) {
    // Validación básica de entrada
    if (!identifier || !password) {
      throw new Error('Usuario y contraseña son requeridos');
    }

    // Ejecutar login a través del servicio
    const result = await this.authService.login(identifier, password);

    // Retornar resultado formateado
    return {
      user: result.user,
      token: result.token,
      success: true
    };
  }
}

window.LoginUserUseCase = LoginUserUseCase;
