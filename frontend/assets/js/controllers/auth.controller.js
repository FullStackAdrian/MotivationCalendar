/**
 * Controlador de autenticación (Frontend)
 * Coordina la interacción entre vistas, casos de uso y servicios
 */

class AuthController {
  /**
   * @param {LoginView} loginView - Vista de login
   * @param {RegisterView} registerView - Vista de registro
   * @param {LoginUserUseCase} loginUseCase - Caso de uso de login
   * @param {RegisterUserUseCase} registerUseCase - Caso de uso de registro
   * @param {Function} onAuthSuccess - Callback cuando la autenticación es exitosa
   */
  constructor({
    loginView,
    registerView,
    loginUseCase,
    registerUseCase,
    onAuthSuccess
  }) {
    this.loginView = loginView;
    this.registerView = registerView;
    this.loginUseCase = loginUseCase;
    this.registerUseCase = registerUseCase;
    this.onAuthSuccess = onAuthSuccess;
    
    this.init();
  }

  /**
   * Inicializa los listeners y estado
   */
  init() {
    // Configurar evento de login
    this.loginView?.onSubmit(async (data) => {
      await this.handleLogin(data.identifier, data.password);
    });

    // Configurar evento de registro (si existe)
    this.registerView?.onSubmit(async (data) => {
      await this.handleRegister(data.username, data.email, data.password);
    });
  }

  /**
   * Maneja el login de usuario
   * @param {string} identifier - Username o email
   * @param {string} password - Contraseña
   */
  async handleLogin(identifier, password) {
    try {
      this.loginView.setLoading(true);
      this.loginView.hideError();

      const result = await this.loginUseCase.execute(identifier, password);
      
      if (result.success || result.token) {
        this.loginView.clearForm();
        this.onAuthSuccess(result.user);
      }
    } catch (error) {
      console.error('Error en login:', error);
      this.loginView.showError(error.message || 'Error al iniciar sesión');
    } finally {
      this.loginView.setLoading(false);
    }
  }

  /**
   * Maneja el registro de usuario
   * @param {string} username - Nombre de usuario
   * @param {string} email - Email
   * @param {string} password - Contraseña
   */
  async handleRegister(username, email, password) {
    try {
      this.registerView?.setLoading(true);
      this.registerView?.hideError();

      const result = await this.registerUseCase.execute(username, email, password);
      
      if (result.success || result.token) {
        this.registerView?.clearForm();
        this.onAuthSuccess(result.user);
      }
    } catch (error) {
      console.error('Error en registro:', error);
      this.registerView?.showError(error.message || 'Error al registrar');
    } finally {
      this.registerView?.setLoading(false);
    }
  }

  /**
   * Muestra la vista de login
   */
  showLogin() {
    this.loginView?.show();
    this.registerView?.hide();
  }

  /**
   * Muestra la vista de registro
   */
  showRegister() {
    this.loginView?.hide();
    this.registerView?.show();
  }

  /**
   * Oculta las vistas de autenticación
   */
  hideAuthViews() {
    this.loginView?.hide();
    this.registerView?.hide();
  }
}

window.AuthController = AuthController;
