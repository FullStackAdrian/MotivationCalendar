/**
 * Caso de uso: Sincronizar Progreso
 * Encapsula la lógica de negocio para sincronizar el progreso del tracker
 */

class SyncProgressUseCase {
  constructor(progressService, totalDays = 365) {
    this.progressService = progressService;
    this.totalDays = totalDays;
  }

  async execute() {
    const response = await this.progressService.getProgress();
    return this.convertServerProgressToLocal(response.progress);
  }

  convertServerProgressToLocal(serverProgress) {
    const clicks = new Array(this.totalDays + 1).fill(0);

    for (const [dayKey, status] of Object.entries(serverProgress || {})) {
      const dayNum = this.dateToDayNumber(dayKey);
      if (dayNum >= 1 && dayNum <= this.totalDays) {
        clicks[dayNum] = this.statusToIndex(status);
      }
    }

    return clicks;
  }

  async saveDay(dayNum, clickValue) {
    try {
      const dayKey = this.dayNumberToDate(dayNum);
      const status = this.indexToStatus(clickValue);

      if (status) await this.progressService.updateDay(dayKey, status);
      return true;
    } catch (error) {
      // An invalid/expired token must not be treated as an offline network failure.
      if (error?.status === 401) throw error;
      console.error('Error al sincronizar:', error);
      return false;
    }
  }

  dateToDayNumber(dateStr) {
    const date = new Date(`${dateStr}T00:00:00Z`);
    const start = new Date('2026-01-01T00:00:00Z');
    const diff = Math.floor((date - start) / 86400000) + 1;
    return diff;
  }

  dayNumberToDate(dayNum) {
    const start = new Date('2026-01-01T00:00:00Z');
    const date = new Date(start.getTime() + (dayNum - 1) * 86400000);
    return date.toISOString().split('T')[0];
  }

  indexToStatus(index) {
    if (index === 1) return 'completed';
    if (index === 2) return 'partial';
    if (index === 3) return 'failed';
    return null;
  }

  statusToIndex(status) {
    if (status === 'completed') return 1;
    if (status === 'partial') return 2;
    if (status === 'failed') return 3;
    return 0;
  }
}

window.SyncProgressUseCase = SyncProgressUseCase;
