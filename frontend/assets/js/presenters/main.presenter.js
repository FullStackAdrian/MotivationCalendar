/**
 * Presentador Principal del Tracker
 * Maneja la lógica de presentación para la vista principal del tracker
 */

class MainPresenter {
  constructor(mainView, syncUseCase, authService) {
    this.mainView = mainView;
    this.syncUseCase = syncUseCase;
    this.authService = authService;
    this.clicks = null;
    this.isServerAvailable = false;
    this.onLogoutCallback = null;
  }

  initialize() {
    this.mainView.onLogout(() => {
      this.handleLogout();
    });
  }

  async show(user) {
    this.mainView.show(user);
    this.initialize();

    await this.loadData();

    if (!this.clicks) return;

    this.mainView.renderGrid(this.clicks, (dayNum, locked) => {
      this.handleDayClick(dayNum, locked);
    });
    this.updateStats();
  }

  hide() {
    this.mainView.hide();
  }

  async loadData() {
    try {
      this.clicks = await this.syncUseCase.execute();
      this.isServerAvailable = true;
      console.log('Datos cargados del servidor');
      this.saveToLocal();
    } catch (error) {
      if (error?.status === 401) {
        this.handleLogout();
        return;
      }

      console.log('Modo offline: usando localStorage');
      this.loadFromLocal();
      this.isServerAvailable = false;
    }
  }

  async handleDayClick(dayNum, locked) {
    if (locked) {
      this.clicks[dayNum] = this.clicks[dayNum] === 0 ? 1 : (this.clicks[dayNum] % 3) + 1;
    } else {
      this.clicks[dayNum] = (this.clicks[dayNum] + 1) % 4;
    }

    this.mainView.updateDayVisual(dayNum, this.clicks, locked);
    this.saveToLocal();
    this.updateStats();

    if (this.isServerAvailable) {
      try {
        await this.syncUseCase.saveDay(dayNum, this.clicks[dayNum]);
      } catch (error) {
        if (error?.status === 401) this.handleLogout();
      }
    }
  }

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

  calculateTodayDoy() {
    const today = new Date();
    const yr = today.getFullYear();
    if (yr === 2026) {
      return Math.floor((today - new Date(2026, 0, 1)) / 86400000) + 1;
    }
    return yr < 2026 ? 0 : 366;
  }

  saveToLocal() {
    try {
      localStorage.setItem('tracker2026', JSON.stringify(this.clicks));
    } catch (e) {
      console.error('Error al guardar en localStorage:', e);
    }
  }

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

  handleLogout() {
    if (this.onLogoutCallback) this.onLogoutCallback();
  }

  setOnLogout(callback) {
    this.onLogoutCallback = callback;
  }
}

window.MainPresenter = MainPresenter;
