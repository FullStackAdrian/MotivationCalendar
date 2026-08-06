/**
 * Servicio de Progreso
 * Maneja la comunicación con la API para operaciones de progreso del tracker
 */

class ProgressService {
  /**
   * @param {APIClient} apiClient - Instancia del cliente API
   */
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Obtiene el progreso del usuario
   * @returns {Promise<Object>} Progreso diario
   */
  async getProgress() {
    return await this.apiClient.getProgress();
  }

  /**
   * Actualiza el estado de un día
   * @param {string} dayKey - Fecha en formato YYYY-MM-DD
   * @param {string} status - Estado (completed, failed, partial)
   * @returns {Promise<Object>} Progreso actualizado
   */
  async updateDay(dayKey, status) {
    return await this.apiClient.updateDay(dayKey, status);
  }

  /**
   * Actualiza múltiples días a la vez
   * @param {Object} updates - Objeto con fechas y estados
   * @returns {Promise<Object>} Progreso actualizado
   */
  async bulkUpdate(updates) {
    return await this.apiClient.bulkUpdate(updates);
  }

  /**
   * Verifica que el servidor esté disponible
   * @returns {Promise<Object>} Estado del servidor
   */
  async healthCheck() {
    return await this.apiClient.healthCheck();
  }
}

window.ProgressService = ProgressService;
