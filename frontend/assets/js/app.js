const loadScript = src => new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = src;
  script.onload = resolve;
  script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
  document.head.appendChild(script);
});

(async () => {
  await Promise.all([
    loadScript('./assets/js/services/kanban.service.js'),
    loadScript('./assets/js/views/kanban.view.js'),
    loadScript('./assets/js/presenters/kanban.presenter.js')
  ]);

  const apiClient = new APIClient();
  const authService = new AuthService(apiClient);
  const progressService = new ProgressService(apiClient);
  const kanbanService = new KanbanService(apiClient);
  const loginUseCase = new LoginUserUseCase(authService);
  const registerUseCase = new RegisterUserUseCase(authService);
  const syncProgressUseCase = new SyncProgressUseCase(progressService);
  const appContainer = document.getElementById('app');
  const loginView = new LoginView(appContainer);
  const registerView = new RegisterView(appContainer);
  const mainView = new MainView(appContainer);
  const kanbanView = new KanbanView(appContainer);

  loginView.onShowRegister(() => { loginView.hide(); registerView.show(); });
  registerView.onShowLogin(() => { registerView.hide(); loginView.show(); });

  const authPresenter = new AuthPresenter(loginUseCase, registerUseCase, authService, loginView, registerView);
  const mainPresenter = new MainPresenter(mainView, syncProgressUseCase, authService);
  const kanbanPresenter = new KanbanPresenter(kanbanView, kanbanService, authService);
  const appController = new AppController(authPresenter, mainPresenter, kanbanPresenter);
  appController.initialize();
})().catch(error => {
  console.error('Error inicializando la aplicación:', error);
});
