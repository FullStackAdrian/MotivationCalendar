class MainPresenter {
  constructor(mainView, syncUseCase, authService) {
    this.mainView = mainView;
    this.syncUseCase = syncUseCase;
    this.authService = authService;
    this.clicks = null;
    this.isServerAvailable = false;
    this.onLogoutCallback = null;
    this.onKanbanCallback = null;
    this.storageKey = null;
  }

  initialize() {
    this.mainView.onLogout(() => this.handleLogout());
    this.mainView.onKanban(() => this.onKanbanCallback?.());
  }

  async show(user) {
    this.storageKey = user?.id ? `tracker2026:${user.id}` : null;
    this.mainView.show(user);
    this.initialize();
    await this.loadData();
    if (!this.clicks) return;
    this.mainView.renderGrid(this.clicks, (dayNum, locked) => this.handleDayClick(dayNum, locked));
    this.updateStats();
  }

  hide() { this.mainView.hide(); }

  async loadData() {
    try {
      this.clicks = await this.syncUseCase.execute();
      this.isServerAvailable = true;
      this.saveToLocal();
    } catch (error) {
      if (error?.status === 401) return this.handleLogout();
      this.loadFromLocal();
      this.isServerAvailable = false;
    }
  }

  async handleDayClick(dayNum, locked) {
    this.clicks[dayNum] = locked ? (this.clicks[dayNum] === 0 ? 1 : (this.clicks[dayNum] % 3) + 1) : (this.clicks[dayNum] + 1) % 4;
    this.mainView.updateDayVisual(dayNum, this.clicks, locked);
    this.saveToLocal(); this.updateStats();
    if (this.isServerAvailable) {
      try { await this.syncUseCase.saveDay(dayNum, this.clicks[dayNum]); }
      catch (error) { if (error?.status === 401) this.handleLogout(); }
    }
  }

  updateStats() {
    const todayDoy = this.calculateTodayDoy(); let d = 0, p = 0, m = 0;
    for (let i = 1; i <= this.mainView.TOTAL; i++) { if (this.clicks[i] === 1) d++; else if (this.clicks[i] === 2) p++; else if (this.clicks[i] === 3) m++; }
    this.mainView.updateStats({ done: d, partial: p, miss: m, left: Math.max(0, this.mainView.TOTAL - todayDoy) });
  }

  calculateTodayDoy() { const today = new Date(); const yr = today.getFullYear(); return yr === 2026 ? Math.floor((today - new Date(2026, 0, 1)) / 86400000) + 1 : (yr < 2026 ? 0 : 366); }
  saveToLocal() { if (this.storageKey) try { localStorage.setItem(this.storageKey, JSON.stringify(this.clicks)); } catch (e) { console.error('Error al guardar en localStorage:', e); } }
  loadFromLocal() {
    const empty = () => new Array(this.mainView.TOTAL + 1).fill(0);
    if (!this.storageKey) return void (this.clicks = empty());
    try { const saved = localStorage.getItem(this.storageKey); this.clicks = saved ? JSON.parse(saved) : empty(); if (!Array.isArray(this.clicks) || this.clicks.length !== this.mainView.TOTAL + 1) this.clicks = empty(); }
    catch (e) { this.clicks = empty(); }
  }

  handleLogout() { this.onLogoutCallback?.(); }
  setOnLogout(callback) { this.onLogoutCallback = callback; }
  setOnKanban(callback) { this.onKanbanCallback = callback; }
}
window.MainPresenter = MainPresenter;
