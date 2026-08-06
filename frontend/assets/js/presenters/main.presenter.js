/**
 * Presentador Principal del Tracker
 * Maneja la lógica de presentación para la vista principal del tracker
 */

class MainPresenter {
  /**
   * @param {MainView} mainView - Vista principal
   * @param {SyncProgressUseCase} syncUseCase - Caso de uso de sincronización
   * @param {AuthService} authService - Servicio de autenticación
   */
  constructor(mainView, syncUseCase, authService) {
    this.mainView = mainView;
    this.syncUseCase = syncUseCase;
    this.authService = authService;
    this.clicks = null;
    this.isServerAvailable = false;
    this.onLogoutCallback = null;
  }

  /**
   * Inicializa el presentador
   */
  initialize() {
    this.mainView.onLogout(() => {
      this.handleLogout();
    });
  }

  /**
   * Muestra la vista principal con los datos del usuario
   * @param {Object} user - Usuario actual
   */
  async show(user) {
    this.mainView.show(user);
    this.initialize();
    
    // Cargar datos
    await this.loadData();
    
    // Renderizar grid y estadísticas
    this.mainView.renderGrid(this.clicks, (dayNum, locked) => {
      this.handleDayClick(dayNum, locked);
    });
    this.updateStats();
  }

  /**
   * Oculta la vista principal
   */
  hide() {
    this.mainView.hide();
  }

  /**
   * Carga los datos del progreso
   */
  async loadData() {
    try {
      // Intentar cargar desde el servidor
      this.clicks = await this.syncUseCase.execute();
      this.isServerAvailable = true;
      console.log('Datos cargados del servidor');
      
      // Guardar en localStorage como backup
      this.saveToLocal();
    } catch (error) {
      console.log('Modo offline: usando localStorage');
      this.loadFromLocal();
      this.isServerAvailable = false;
    }
  }

  /**
   * Maneja el click en un día
   * @param {number} dayNum - Número del día
   * @param {boolean} locked - Si el día está bloqueado
   */
  async handleDayClick(dayNum, locked) {
    if (locked) {
      this.clicks[dayNum] = this.clicks[dayNum] === 0 ? 1 : (this.clicks[dayNum] % 3) + 1;
    } else {
      this.clicks[dayNum] = (this.clicks[dayNum] + 1) % 4;
    }
    
    // Actualizar visualmente solo el día modificado
    this.mainView.updateDayVisual(dayNum, this.clicks, locked);
    this.saveToLocal();
    this.updateStats();
    
    // Sincronizar con servidor si está disponible
    if (this.isServerAvailable) {
      await this.syncUseCase.saveDay(dayNum, this.clicks[dayNum]);
    }
  }

  /**
   * Actualiza las estadísticas
   */
  updateStats() {
    const todayDoy = this.calculateTodayDoy();
    
    let d = 0, p = 0, m = 0;
    for (let i = 1; i <= this.mainView.TOTAL; i++) {
      if (this.clicks[i] === 1) d++;
      else if (this.clicks[i] === 2) p++;
      else if (this.clicks[i] === 3) m++;
    }
    
    this.mainView.updateStats({
      done: d,
      partial: p,
      miss: m,
      left: Math.max(0, this.mainView.TOTAL - todayDoy)
    });
  }

  /**
   * Calcula el día del año actual
   * @returns {number}
   */
  calculateTodayDoy() {
    const today = new Date();
    const yr = today.getFullYear();
    if (yr === 2026) {
      return Math.floor((today - new Date(2026, 0, 1)) / 86400000) + 1;
    } else {
      return yr < 2026 ? 0 : 366;
    }
  }

  /**
   * Guarda el progreso en localStorage
   */
  saveToLocal() {
    try {
      localStorage.setItem('tracker2026', JSON.stringify(this.clicks));
    } catch (e) {
      console.error('Error al guardar en localStorage:', e);
    }
  }

  /**
   * Carga el progreso desde localStorage
   */
  loadFromLocal() {
    try {
      const saved = localStorage.getItem('tracker2026');
      if (saved) {
        this.clicks = JSON.parse(saved);
        if (!Array.isArray(this.clicks) || this.clicks.length !== this.mainView.TOTAL + 1) {
          this.clicks = new Array(this.mainView.TOTAL + 1).fill(0);
        }
      } else {
        this.clicks = new Array(this.mainView.TOTAL + 1).fill(0);
      }
    } catch (e) {
      this.clicks = new Array(this.mainView.TOTAL + 1).fill(0);
    }
  }

  /**
   * Maneja el logout
   */
  handleLogout() {
    if (this.onLogoutCallback) {
      this.onLogoutCallback();
    }
  }

  /**
   * Establece el callback para cuando se cierra sesión
   * @param {Function} callback
   */
  setOnLogout(callback) {
    this.onLogoutCallback = callback;
  }
}

window.MainPresenter = MainPresenter;
