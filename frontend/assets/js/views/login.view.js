/**
 * Vista de Login
 * Maneja la presentación y eventos de la UI de login
 */

class LoginView {
  constructor(container) {
    this.container = container;
    this.form = null;
    this.identifierInput = null;
    this.passwordInput = null;
    this.errorContainer = null;
    this.showRegisterLink = null;
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="auth-box">
        <h1>2026 Tracker</h1>
        <p class="auth-subtitle">Inicia sesión para sincronizar tu progreso</p>
        <form class="auth-form">
          <div class="form-group">
            <label for="login-identifier">Usuario o Email</label>
            <input type="text" id="login-identifier" required autocomplete="username">
          </div>
          <div class="form-group">
            <label for="login-password">Contraseña</label>
            <input type="password" id="login-password" required autocomplete="current-password">
          </div>
          <div class="error-message" id="login-error" style="display: none;"></div>
          <button type="submit" class="btn-primary">Entrar</button>
        </form>
        <p class="auth-switch">
          ¿No tienes cuenta?
          <a href="#" id="show-register">Regístrate</a>
        </p>
      </div>
    `;

    this.form = this.container.querySelector('form');
    this.identifierInput = this.container.querySelector('#login-identifier');
    this.passwordInput = this.container.querySelector('#login-password');
    this.errorContainer = this.container.querySelector('#login-error');
    this.showRegisterLink = this.container.querySelector('#show-register');
  }

  show() {
    if (!this.container) return;
    this.render();
    this.container.style.display = 'block';
  }

  hide() {
    // El contenedor es compartido con el resto de vistas; no manipularlo.
  }

  validateForm() {
    const identifier = this.identifierInput?.value.trim() || '';
    const password = this.passwordInput?.value || '';
    const errors = [];

    if (!identifier) errors.push('Ingresa tu usuario o email');
    if (!password) errors.push('Ingresa tu contraseña');
    else if (password.length < 6) errors.push('La contraseña debe tener al menos 6 caracteres');

    return { valid: errors.length === 0, data: { identifier, password }, errors };
  }

  getFormData() {
    return this.validateForm().data;
  }

  clearForm() {
    if (this.form) this.form.reset();
    this.hideError();
    if (this.identifierInput) this.identifierInput.focus();
  }

  showError(messages) {
    const messageText = Array.isArray(messages) ? messages.join('\n') : String(messages ?? '');
    if (!this.errorContainer) {
      alert(messageText);
      return;
    }

    this.errorContainer.textContent = messageText;
    this.errorContainer.style.whiteSpace = 'pre-line';
    this.errorContainer.style.display = 'block';
    this.errorContainer.className = 'error-message error-visible';
  }

  hideError() {
    if (this.errorContainer) {
      this.errorContainer.style.display = 'none';
      this.errorContainer.style.whiteSpace = '';
      this.errorContainer.textContent = '';
      this.errorContainer.className = 'error-message';
    }
  }

  onSubmit(callback) {
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const validation = this.validateForm();
        if (!validation.valid) {
          this.showError(validation.errors);
          return;
        }
        callback(validation.data);
      });
    }
  }

  onShowRegister(callback) {
    if (this.showRegisterLink) {
      this.showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        callback();
      });
    }
  }

  setLoading(isLoading) {
    const submitBtn = this.form?.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.textContent = isLoading ? 'Cargando...' : 'Entrar';
    }
  }
}

window.LoginView = LoginView;
