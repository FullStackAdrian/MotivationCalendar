/**
 * Vista de Login
 * Maneja la presentación y eventos de la UI de login
 */

class LoginView {
  /**
   * @param {Object} elements - Elementos del DOM
   * @param {HTMLElement} elements.container - Contenedor principal
   * @param {HTMLFormElement} elements.form - Formulario de login
   * @param {HTMLInputElement} elements.identifierInput - Input de usuario/email
   * @param {HTMLInputElement} elements.passwordInput - Input de contraseña
   * @param {HTMLElement} elements.errorContainer - Contenedor para mensajes de error
   */
  constructor(elements) {
    this.container = elements.container;
    this.form = elements.form;
    this.identifierInput = elements.identifierInput;
    this.passwordInput = elements.passwordInput;
    this.errorContainer = elements.errorContainer || null;
  }

  /**
   * Muestra la vista de login
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
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
   * Obtiene los valores del formulario
   * @returns {Object} Datos del formulario
   */
  getFormData() {
    return {
      identifier: this.identifierInput?.value.trim() || '',
      password: this.passwordInput?.value || ''
    };
  }

  /**
   * Limpia el formulario
   */
  clearForm() {
    if (this.form) {
      this.form.reset();
    }
  }

  /**
   * Muestra un mensaje de error
   * @param {string} message - Mensaje a mostrar
   */
  showError(message) {
    if (this.errorContainer) {
      this.errorContainer.textContent = message;
      this.errorContainer.style.display = 'block';
    } else {
      alert(message);
    }
  }

  /**
   * Oculta los mensajes de error
   */
  hideError() {
    if (this.errorContainer) {
      this.errorContainer.style.display = 'none';
      this.errorContainer.textContent = '';
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
        callback(this.getFormData());
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
