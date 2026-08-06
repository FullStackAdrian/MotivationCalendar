/**
 * Controlador Principal de la Aplicación
 * Orquesta la comunicación entre presenters, servicios y vistas
 */

class AppController {
  /**
   * @param {AuthPresenter} authPresenter - Presentador de autenticación
   * @param {MainPresenter} mainPresenter - Presentador principal
   */
  constructor(authPresenter, mainPresenter) {
    this.authPresenter = authPresenter;
    this.mainPresenter = mainPresenter;
    this.currentUser = null;
  }

  /**
   * Inicializa la aplicación
   */
  initialize() {
    // Configurar callback de autenticación exitosa
    this.authPresenter.setOnAuthSuccess((user) => {
      this.currentUser = user;
      this.showApp();
    });

    // Configurar callback de logout
    this.mainPresenter.setOnLogout(() => {
      this.handleLogout();
    });

    // Verificar estado de autenticación
    this.checkAuth();
  }

  /**
   * Verifica el estado de autenticación del usuario
   */
  checkAuth() {
    if (this.authPresenter.isAuthenticated()) {
      const user = this.authPresenter.getCurrentUser();
      if (user) {
        this.currentUser = user;
        this.showApp();
      } else {
        this.showLogin();
      }
    } else {
      this.showLogin();
    }
  }

  /**
   * Muestra la vista de login
   */
  showLogin() {
    this.authPresenter.showLogin();
    this.mainPresenter.hide();
  }

  /**
   * Muestra la vista de registro
   */
  showRegister() {
    this.authPresenter.showRegister();
    this.mainPresenter.hide();
  }

  /**
   * Muestra la aplicación principal
   */
  async showApp() {
    this.authPresenter.hideAuthViews();
    
    if (this.currentUser) {
      await this.mainPresenter.show(this.currentUser);
    } else {
      // Si no hay usuario, volver al login
      this.showLogin();
    }
  }

  /**
   * Maneja el logout del usuario
   */
  handleLogout() {
    this.authPresenter.logout();
    this.currentUser = null;
    this.showLogin();
  }
}

window.AppController = AppController;
