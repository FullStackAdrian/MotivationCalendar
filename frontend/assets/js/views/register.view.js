/**
 * Vista de Registro
 * Maneja la presentación y eventos de la UI de registro
 */

class RegisterView {
  constructor(container) {
    this.container = container;
    this.form = null;
    this.usernameInput = null;
    this.emailInput = null;
    this.passwordInput = null;
    this.errorContainer = null;
    this.showLoginLink = null;
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="auth-box">
        <h1>Crear Cuenta</h1>
        <p class="auth-subtitle">Sincroniza tu progreso en todos tus dispositivos</p>
        <form class="auth-form">
          <div class="form-group">
            <label for="register-username">Usuario</label>
            <input type="text" id="register-username" required autocomplete="username" maxlength="50">
          </div>
          <div class="form-group">
            <label for="register-email">Email</label>
            <input type="email" id="register-email" required autocomplete="email" maxlength="255">
          </div>
          <div class="form-group">
            <label for="register-password">Contraseña</label>
            <input type="password" id="register-password" required autocomplete="new-password" minlength="6" maxlength="72">
          </div>
          <div class="error-message" id="register-error" style="display: none;"></div>
          <button type="submit" class="btn-primary">Registrarse</button>
        </form>
        <p class="auth-switch">
          ¿Ya tienes cuenta?
          <a href="#" id="show-login">Inicia sesión</a>
        </p>
      </div>
    `;

    this.form = this.container.querySelector('form');
    this.usernameInput = this.container.querySelector('#register-username');
    this.emailInput = this.container.querySelector('#register-email');
    this.passwordInput = this.container.querySelector('#register-password');
    this.errorContainer = this.container.querySelector('#register-error');
    this.showLoginLink = this.container.querySelector('#show-login');
  }

  show() {
    if (!this.container) return;
    if (!this.container.innerHTML.trim()) this.render();
    this.container.style.display = 'block';
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
  }

  validateForm() {
    const username = this.usernameInput?.value.trim() || '';
    const email = this.emailInput?.value.trim() || '';
    const password = this.passwordInput?.value || '';
    const errors = [];

    if (!username) errors.push('Ingresa un nombre de usuario');
    else if (username.length < 3 || username.length > 50) errors.push('El usuario debe tener entre 3 y 50 caracteres');

    if (!email) errors.push('Ingresa un email');
    else if (!this.isValidEmail(email) || email.length > 255) errors.push('Ingresa un email válido');

    if (!password) errors.push('Ingresa una contraseña');
    else if (password.length < 6 || password.length > 72) errors.push('La contraseña debe tener entre 6 y 72 caracteres');

    return { valid: errors.length === 0, data: { username, email, password }, errors };
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  getFormData() {
    return this.validateForm().data;
  }

  clearForm() {
    if (this.form) this.form.reset();
    this.hideError();
    if (this.usernameInput) this.usernameInput.focus();
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

  onShowLogin(callback) {
    if (this.showLoginLink) {
      this.showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        callback();
      });
    }
  }

  setLoading(isLoading) {
    const submitBtn = this.form?.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.textContent = isLoading ? 'Registrando...' : 'Registrarse';
    }
  }
}

window.RegisterView = RegisterView;
