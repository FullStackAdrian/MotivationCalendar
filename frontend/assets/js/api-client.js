/**
 * Cliente API para comunicación con el backend
 * Maneja autenticación y sincronización de datos
 */

// Detectar baseURL automáticamente según el entorno
const getBaseURL = () => {
  // Si estamos en GitHub Pages, usar la URL del repositorio
  const hostname = window.location.hostname;
  
  if (hostname.includes('github.io')) {
    // GitHub Pages: usar GitHub Actions para backend o servicio externo
    // Por defecto, apuntamos a un servicio desplegado (ej. Railway, Render, etc.)
    // El usuario debe configurar esta variable si usa otro proveedor
    return window.GITHUB_PAGES_API_URL || 'https://tu-backend.herokuapp.com';
  }
  
  // Desarrollo local o servidor Node.js directo
  return '';
};

class APIClient {
  constructor(baseURL = getBaseURL()) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  /**
   * Establece el token de autenticación
   * @param {string} token - JWT token
   */
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  /**
   * Obtiene headers para requests autenticados
   * @returns {Object} Headers HTTP
   */
  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Realiza una petición HTTP
   * @param {string} endpoint - Endpoint de la API
   * @param {Object} options - Opciones de fetch
   * @returns {Promise<any>} Respuesta parseada
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en la petición');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  /**
   * Registra un nuevo usuario
   * @param {string} username - Nombre de usuario
   * @param {string} email - Email
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} Datos del usuario y token
   */
  async register(username, email, password) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    
    if (data.token) {
      this.setToken(data.token);
    }
    
    return data;
  }

  /**
   * Inicia sesión
   * @param {string} identifier - Username o email
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} Datos del usuario y token
   */
  async login(identifier, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    
    if (data.token) {
      this.setToken(data.token);
    }
    
    return data;
  }

  /**
   * Cierra sesión
   */
  logout() {
    this.setToken(null);
  }

  /**
   * Verifica si hay un token válido
   * @returns {boolean} True si está autenticado
   */
  isAuthenticated() {
    return !!this.token;
  }

  /**
   * Obtiene el progreso del usuario
   * @returns {Promise<Object>} Progreso diario
   */
  async getProgress() {
    return await this.request('/api/progress');
  }

  /**
   * Actualiza el estado de un día
   * @param {string} dayKey - Fecha en formato YYYY-MM-DD
   * @param {string} status - Estado (completed, failed, partial)
   * @returns {Promise<Object>} Progreso actualizado
   */
  async updateDay(dayKey, status) {
    return await this.request(`/api/progress/${dayKey}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  /**
   * Actualiza múltiples días a la vez
   * @param {Object} updates - Objeto con fechas y estados
   * @returns {Promise<Object>} Progreso actualizado
   */
  async bulkUpdate(updates) {
    return await this.request('/api/progress/bulk', {
      method: 'POST',
      body: JSON.stringify({ updates })
    });
  }

  /**
   * Verifica que el servidor esté disponible
   * @returns {Promise<Object>} Estado del servidor
   */
  async healthCheck() {
    return await this.request('/api/health');
  }
}

// Exportar instancia global
window.apiClient = new APIClient();
