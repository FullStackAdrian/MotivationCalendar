/**
 * Caso de uso: Sincronizar Progreso
 * Encapsula la lógica de negocio para sincronizar el progreso del tracker
 */

class SyncProgressUseCase {
  /**
   * @param {ProgressService} progressService - Servicio de progreso
   * @param {number} totalDays - Total de días en el tracker (por defecto 365)
   */
  constructor(progressService, totalDays = 365) {
    this.progressService = progressService;
    this.totalDays = totalDays;
  }

  /**
   * Obtiene el progreso del servidor y lo convierte al formato local
   * @returns {Promise<Array>} Array con el estado de cada día
   */
  async execute() {
    const response = await this.progressService.getProgress();
    return this.convertServerProgressToLocal(response.progress);
  }

  /**
   * Convierte el progreso del servidor al formato local
   * @param {Object} serverProgress - Progreso en formato del servidor
   * @returns {Array} Array con el estado de cada día
   */
  convertServerProgressToLocal(serverProgress) {
    const clicks = new Array(this.totalDays + 1).fill(0);

    for (const [dayKey, status] of Object.entries(serverProgress)) {
      const dayNum = this.dateToDayNumber(dayKey);
      if (dayNum >= 1 && dayNum <= this.totalDays) {
        clicks[dayNum] = this.statusToIndex(status);
      }
    }

    return clicks;
  }

  /**
   * Guarda un día en el servidor
   * @param {number} dayNum - Número del día (1-365)
   * @param {number} clickValue - Valor del click (0-3)
   * @returns {Promise<boolean>} True si se guardó exitosamente
   */
  async saveDay(dayNum, clickValue) {
    try {
      const dayKey = this.dayNumberToDate(dayNum);
      const status = this.indexToStatus(clickValue);
      
      if (status) {
        await this.progressService.updateDay(dayKey, status);
      }
      return true;
    } catch (error) {
      console.error('Error al sincronizar:', error);
      return false;
    }
  }

  /**
   * Convierte una fecha a número de día
   * @param {string} dateStr - Fecha en formato YYYY-MM-DD
   * @returns {number} Número del día (1-365)
   */
  dateToDayNumber(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const start = new Date('2026-01-01T00:00:00');
    const diff = Math.floor((date - start) / 86400000) + 1;
    return diff;
  }

  /**
   * Convierte número de día a fecha
   * @param {number} dayNum - Número del día (1-365)
   * @returns {string} Fecha en formato YYYY-MM-DD
   */
  dayNumberToDate(dayNum) {
    const start = new Date('2026-01-01T00:00:00');
    const date = new Date(start.getTime() + (dayNum - 1) * 86400000);
    return date.toISOString().split('T')[0];
  }

  /**
   * Convierte índice a estado
   * @param {number} index - Índice (0-3)
   * @returns {string|null} Estado correspondiente
   */
  indexToStatus(index) {
    if (index === 1) return 'completed';
    if (index === 2) return 'partial';
    if (index === 3) return 'failed';
    return null;
  }

  /**
   * Convierte estado a índice
   * @param {string} status - Estado del servidor
   * @returns {number} Índice correspondiente
   */
  statusToIndex(status) {
    if (status === 'completed') return 1;
    if (status === 'partial') return 2;
    if (status === 'failed') return 3;
    return 0;
  }
}

window.SyncProgressUseCase = SyncProgressUseCase;
