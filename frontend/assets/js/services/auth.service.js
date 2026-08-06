/**
 * Servicio de Autenticación
 * Maneja la comunicación con la API para operaciones de autenticación
 */

class AuthService {
  /**
   * @param {APIClient} apiClient - Instancia del cliente API
   */
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Registra un nuevo usuario
   * @param {string} username - Nombre de usuario
   * @param {string} email - Email
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} Datos del usuario y token
   */
  async register(username, email, password) {
    return await this.apiClient.register(username, email, password);
  }

  /**
   * Inicia sesión
   * @param {string} identifier - Username o email
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} Datos del usuario y token
   */
  async login(identifier, password) {
    return await this.apiClient.login(identifier, password);
  }

  /**
   * Cierra sesión
   */
  logout() {
    this.apiClient.logout();
  }

  /**
   * Verifica si hay un token válido
   * @returns {boolean} True si está autenticado
   */
  isAuthenticated() {
    return this.apiClient.isAuthenticated();
  }

  /**
   * Obtiene el usuario actual
   * @returns {Object|null} Datos del usuario o null
   */
  getCurrentUser() {
    return this.apiClient.getCurrentUser();
  }
}

window.AuthService = AuthService;
