class AppController {
  constructor(authPresenter, mainPresenter, kanbanPresenter) {
    this.authPresenter = authPresenter;
    this.mainPresenter = mainPresenter;
    this.kanbanPresenter = kanbanPresenter;
    this.currentUser = null;
  }

  initialize() {
    this.authPresenter.setOnAuthSuccess(user => { this.currentUser = user; this.showApp(); });
    this.mainPresenter.setOnLogout(() => this.handleLogout());
    this.mainPresenter.setOnKanban(() => this.showKanban());
    this.kanbanPresenter.setOnBack(() => this.showCalendar());
    this.checkAuth();
  }

  checkAuth() {
    if (this.authPresenter.isAuthenticated()) {
      const user = this.authPresenter.getCurrentUser();
      if (user) { this.currentUser = user; this.showApp(); } else this.showLogin();
    } else this.showLogin();
  }

  showLogin() { this.authPresenter.showLogin(); this.mainPresenter.hide(); this.kanbanPresenter.hide(); }
  showRegister() { this.authPresenter.showRegister(); this.mainPresenter.hide(); this.kanbanPresenter.hide(); }
  async showApp() { this.authPresenter.hideAuthViews(); if (this.currentUser) await this.showCalendar(); else this.showLogin(); }
  async showCalendar() { this.kanbanPresenter.hide(); await this.mainPresenter.show(this.currentUser); }
  async showKanban() { this.mainPresenter.hide(); try { await this.kanbanPresenter.show(this.currentUser); } catch (error) { if (error?.status === 401) this.handleLogout(); else { console.error(error); alert(error.message); await this.showCalendar(); } } }
  handleLogout() { this.authPresenter.logout(); this.currentUser = null; this.kanbanPresenter.hide(); this.showLogin(); }
}
window.AppController = AppController;
