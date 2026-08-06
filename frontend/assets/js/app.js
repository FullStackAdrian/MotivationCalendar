/**
 * Aplicación principal del frontend
 * Arquitectura refactorizada: usecase - service - controller - presenter - view
 */

/* ── INICIALIZACIÓN DE DEPENDENCIAS ── */

// Crear instancia del cliente API
const apiClient = new APIClient();

// Crear servicios
const authService = new AuthService(apiClient);
const progressService = new ProgressService(apiClient);

// Crear casos de uso
const loginUseCase = new LoginUserUseCase(authService);
const registerUseCase = new RegisterUserUseCase(authService);
const syncProgressUseCase = new SyncProgressUseCase(progressService);

// Inicializar vistas
const appContainer = document.getElementById('app');
const loginView = new LoginView(appContainer);
const registerView = new RegisterView(appContainer);
const mainView = new MainView(appContainer);

// Configurar navegación entre vistas de autenticación
loginView.onShowRegister(() => {
  loginView.hide();
  registerView.show();
});

registerView.onShowLogin(() => {
  registerView.hide();
  loginView.show();
});

// Crear presenters
const authPresenter = new AuthPresenter(
  loginUseCase,
  registerUseCase,
  authService,
  loginView,
  registerView
);

const mainPresenter = new MainPresenter(
  mainView,
  syncProgressUseCase,
  authService
);

// Crear controlador principal
const appController = new AppController(authPresenter, mainPresenter);

/* ── INICIALIZACIÓN DE LA APLICACIÓN ── */

// Iniciar aplicación
appController.initialize();
