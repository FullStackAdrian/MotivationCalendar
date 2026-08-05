/**
 * Vista de Registro
 * Maneja la presentación y eventos de la UI de registro
 */

class RegisterView {
  /**
   * @param {HTMLElement} container - Contenedor principal donde se renderizará la vista
   */
  constructor(container) {
    this.container = container;
    this.form = null;
    this.usernameInput = null;
    this.emailInput = null;
    this.passwordInput = null;
    this.errorContainer = null;
    this.showLoginLink = null;
  }

  /**
   * Renderiza el HTML de la vista de registro
   */
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="auth-box">
        <h1>Crear Cuenta</h1>
        <p class="auth-subtitle">Sincroniza tu progreso en todos tus dispositivos</p>
        
        <form class="auth-form">
          <div class="form-group">
            <label for="register-username">Usuario</label>
            <input type="text" id="register-username" required autocomplete="username">
          </div>
          
          <div class="form-group">
            <label for="register-email">Email</label>
            <input type="email" id="register-email" required autocomplete="email">
          </div>
          
          <div class="form-group">
            <label for="register-password">Contraseña</label>
            <input type="password" id="register-password" required autocomplete="new-password" minlength="6">
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
    
    // Guardar referencias a los elementos
    this.form = this.container.querySelector('form');
    this.usernameInput = this.container.querySelector('#register-username');
    this.emailInput = this.container.querySelector('#register-email');
    this.passwordInput = this.container.querySelector('#register-password');
    this.errorContainer = this.container.querySelector('#register-error');
    this.showLoginLink = this.container.querySelector('#show-login');
  }

  /**
   * Muestra la vista de registro (renderiza si es necesario)
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
   * Oculta la vista de registro
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
    const username = this.usernameInput?.value.trim() || '';
    const email = this.emailInput?.value.trim() || '';
    const password = this.passwordInput?.value || '';
    const errors = [];

    if (!username) {
      errors.push('Ingresa un nombre de usuario');
    } else if (username.length < 3) {
      errors.push('El usuario debe tener al menos 3 caracteres');
    }

    if (!email) {
      errors.push('Ingresa un email');
    } else if (!this.isValidEmail(email)) {
      errors.push('Ingresa un email válido');
    }

    if (!password) {
      errors.push('Ingresa una contraseña');
    } else if (password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    return {
      valid: errors.length === 0,
      data: { username, email, password },
      errors
    };
  }

  /**
   * Valida el formato de email
   * @param {string} email - Email a validar
   * @returns {boolean} True si es válido
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
    if (this.usernameInput) {
      this.usernameInput.focus();
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
   * Establece un listener para mostrar el login
   * @param {Function} callback - Función a ejecutar
   */
  onShowLogin(callback) {
    if (this.showLoginLink) {
      this.showLoginLink.addEventListener('click', (e) => {
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
      submitBtn.textContent = isLoading ? 'Registrando...' : 'Registrarse';
    }
  }
}

window.RegisterView = RegisterView;
