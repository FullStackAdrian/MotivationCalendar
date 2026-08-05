/**
 * Vista de Login
 * Maneja la presentación y eventos de la UI de login
 */

class LoginView {
  /**
   * @param {HTMLElement} container - Contenedor principal donde se renderizará la vista
   */
  constructor(container) {
    this.container = container;
    this.form = null;
    this.identifierInput = null;
    this.passwordInput = null;
    this.errorContainer = null;
    this.showRegisterLink = null;
  }

  /**
   * Renderiza el HTML de la vista de login
   */
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
    
    // Guardar referencias a los elementos
    this.form = this.container.querySelector('form');
    this.identifierInput = this.container.querySelector('#login-identifier');
    this.passwordInput = this.container.querySelector('#login-password');
    this.errorContainer = this.container.querySelector('#login-error');
    this.showRegisterLink = this.container.querySelector('#show-register');
  }

  /**
   * Muestra la vista de login (renderiza si es necesario)
   */
  show() {
    if (!this.container) return;
    
    // Renderizar si no tiene contenido
    if (!this.container.innerHTML.trim()) {
      this.render();
    }
    
    this.container.style.display = 'block';
  }

  /**
   * Oculta la vista de login
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Valida los datos del formulario
   * @returns {Object} { valid: boolean, data?: Object, errors?: Array }
   */
  validateForm() {
    const identifier = this.identifierInput?.value.trim() || '';
    const password = this.passwordInput?.value || '';
    const errors = [];

    if (!identifier) {
      errors.push('Ingresa tu usuario o email');
    }

    if (!password) {
      errors.push('Ingresa tu contraseña');
    } else if (password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    return {
      valid: errors.length === 0,
      data: { identifier, password },
      errors
    };
  }

  /**
   * Obtiene los valores del formulario
   * @returns {Object} Datos del formulario
   */
  getFormData() {
    const validation = this.validateForm();
    return validation.data;
  }

  /**
   * Limpia el formulario y oculta errores
   */
  clearForm() {
    if (this.form) {
      this.form.reset();
    }
    this.hideError();
    if (this.identifierInput) {
      this.identifierInput.focus();
    }
  }

  /**
   * Muestra un mensaje de error
   * @param {string|Array} messages - Mensaje o array de mensajes a mostrar
   */
  showError(messages) {
    if (!this.errorContainer) {
      alert(Array.isArray(messages) ? messages.join('\n') : messages);
      return;
    }
    
    const messageText = Array.isArray(messages) ? messages.join('<br>') : messages;
    this.errorContainer.innerHTML = messageText;
    this.errorContainer.style.display = 'block';
    this.errorContainer.className = 'error-message error-visible';
  }

  /**
   * Oculta los mensajes de error
   */
  hideError() {
    if (this.errorContainer) {
      this.errorContainer.style.display = 'none';
      this.errorContainer.textContent = '';
      this.errorContainer.className = 'error-message';
    }
  }

  /**
   * Establece un listener para el evento submit
   * @param {Function} callback - Función a ejecutar al enviar
   */
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

  /**
   * Establece un listener para mostrar el registro
   * @param {Function} callback - Función a ejecutar
   */
  onShowRegister(callback) {
    if (this.showRegisterLink) {
      this.showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        callback();
      });
    }
  }

  /**
   * Establece el estado de carga del botón
   * @param {boolean} isLoading - True si está cargando
   */
  setLoading(isLoading) {
    const submitBtn = this.form?.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.textContent = isLoading ? 'Cargando...' : 'Entrar';
    }
  }
}

window.LoginView = LoginView;
