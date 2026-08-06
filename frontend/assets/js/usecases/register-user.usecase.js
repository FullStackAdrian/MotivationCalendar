/**
 * Caso de uso: Registrar Usuario
 * Encapsula la lógica de negocio para el registro de usuario
 */

class RegisterUserUseCase {
  /**
   * @param {AuthService} authService - Servicio de autenticación
   */
  constructor(authService) {
    this.authService = authService;
  }

  /**
   * Ejecuta el caso de uso de registro
   * @param {Object} userData - Datos del usuario
   * @param {string} userData.username - Nombre de usuario
   * @param {string} userData.email - Email
   * @param {string} userData.password - Contraseña
   * @returns {Promise<Object>} Resultado del registro
   * @throws {Error} Si los datos son inválidos
   */
  async execute({ username, email, password }) {
    // Validación básica de entrada
    if (!username || !email || !password) {
      throw new Error('Todos los campos son requeridos');
    }

    if (username.length < 3) {
      throw new Error('El usuario debe tener al menos 3 caracteres');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Ingresa un email válido');
    }

    // Ejecutar registro a través del servicio
    const result = await this.authService.register(username, email, password);

    // Retornar resultado formateado
    return {
      user: result.user,
      token: result.token,
      success: true
    };
  }
}

window.RegisterUserUseCase = RegisterUserUseCase;
