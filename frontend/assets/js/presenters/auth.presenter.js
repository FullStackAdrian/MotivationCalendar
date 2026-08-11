/**
 * Presentador de Autenticación
 * Maneja la lógica de presentación para las vistas de login y registro
 */

class AuthPresenter {
  /**
   * @param {LoginUserUseCase} loginUseCase - Caso de uso de login
   * @param {RegisterUserUseCase} registerUseCase - Caso de uso de registro
   * @param {AuthService} authService - Servicio de autenticación
   * @param {LoginView} loginView - Vista de login
   * @param {RegisterView} registerView - Vista de registro
   */
  constructor(loginUseCase, registerUseCase, authService, loginView, registerView) {
    this.loginUseCase = loginUseCase;
    this.registerUseCase = registerUseCase;
    this.authService = authService;
    this.loginView = loginView;
    this.registerView = registerView;
    this.onAuthSuccess = null;
  }

  /**
   * Establece el callback para cuando la autenticación es exitosa
   * @param {Function} callback 
   */
  setOnAuthSuccess(callback) {
    this.onAuthSuccess = callback;
  }

  /**
   * Inicializa los eventos de autenticación
   */
  initialize() {
    this.setupLoginEvents();
    this.setupRegisterEvents();
  }  /**
   * Configura los eventos del formulario de login
   */
  setupLoginEvents() {
    this.loginView.onSubmit(async (data) => {
      this.loginView.setLoading(true);
      
      try {
        const result = await this.loginUseCase.execute(data);
        this.loginView.clearForm();
        
        if (this.onAuthSuccess) {
          this.onAuthSuccess(result.user);
        }
      } catch (error) {
        this.loginView.showError(error.message || 'Error al iniciar sesión');
      } finally {
        this.loginView.setLoading(false);
      }
    });

    this.loginView.onShowRegister(() => {
      this.showRegister();
    });
  }

  /**
   * Configura los eventos del formulario de registro
   */
  setupRegisterEvents() {
    this.registerView.onSubmit(async (data) => {
      this.registerView.setLoading(true);
      
      try {
        const result = await this.registerUseCase.execute(data);
        this.registerView.clearForm();
        
        if (this.onAuthSuccess) {
          this.onAuthSuccess(result.user);
        }
      } catch (error) {
        this.registerView.showError(error.message || 'Error al registrar');
      } finally {
        this.registerView.setLoading(false);
      }
    });

    this.registerView.onShowLogin(() => {
      this.showLogin();
    });
  }

  /**
   * Muestra la vista de login
   */
  showLogin() {
    this.loginView.show();
    this.setupLoginEvents();
    this.registerView.hide();
  }

  /**
   * Muestra la vista de registro
   */
  showRegister() {
    this.loginView.hide();
    this.registerView.show();
    this.setupRegisterEvents();
  }

  /**
   * Oculta ambas vistas de autenticación
   */
  hideAuthViews() {
    this.loginView.hide();
    this.registerView.hide();
  }

  /**
   * Verifica si el usuario está autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.authService.isAuthenticated();
  }

  /**
   * Obtiene el usuario actual
   * @returns {Object|null}
   */
  getCurrentUser() {
    return this.authService.getCurrentUser();
  }

  /**
   * Cierra sesión
   */
  logout() {
    this.authService.logout();
  }
}

window.AuthPresenter = AuthPresenter;
