/**
 * Vista Principal de la Aplicación
 * Maneja la presentación y eventos de la UI principal del tracker
 */

class MainView {
  /**
   * @param {HTMLElement} container - Contenedor principal donde se renderizará la vista
   */
  constructor(container) {
    this.container = container;
    this.TOTAL = 365;
    this.states = [null, 'done', 'partial', 'miss'];
    
    // Calcular día del año actual
    const today = new Date();
    const yr = today.getFullYear();
    if (yr === 2026) {
      this.todayDoy = Math.floor((today - new Date(2026, 0, 1)) / 86400000) + 1;
    } else {
      this.todayDoy = yr < 2026 ? 0 : 366;
    }
  }

  /**
   * Muestra la vista principal
   * @param {Object} user - Usuario actual
   */
  show(user) {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <header>
        <div class="user-header">
          <span id="user-info">Hola, ${user.username}</span>
          <button id="logout-btn" class="btn-logout">Salir</button>
        </div>
        <div class="year">2026</div>
        <div class="tagline">Cada día que pasa, ya no vuelve</div>
      </header>

      <div class="stats">
        <div class="stat">
          <div class="stat-n" id="cnt-done">0</div>
          <div class="stat-label"><span class="dot" style="background:var(--done)"></span>Todo bien</div>
        </div>
        <div class="stat">
          <div class="stat-n" id="cnt-partial">0</div>
          <div class="stat-label"><span class="dot" style="background:var(--partial)"></span>A medias</div>
        </div>
        <div class="stat">
          <div class="stat-n" id="cnt-miss">0</div>
          <div class="stat-label"><span class="dot" style="background:var(--miss)"></span>Sin cumplir</div>
        </div>
        <div class="stat">
          <div class="stat-n" id="cnt-left">—</div>
          <div class="stat-label">Días restantes</div>
        </div>
      </div>

      <div class="grid" id="grid"></div>

      <div class="legend">
        <div class="legend-item">
          <div class="swatch sw-past"></div>Pasado sin marcar
        </div>
        <div class="legend-item">
          <div class="swatch sw-future"></div>Por venir
        </div>
        <div class="legend-item">
          <div class="swatch sw-done"></div>Todo bien
        </div>
        <div class="legend-item">
          <div class="swatch sw-partial"></div>A medias
        </div>
        <div class="legend-item">
          <div class="swatch sw-miss"></div>Sin cumplir
        </div>
      </div>

      <footer>365 oportunidades &nbsp;·&nbsp; Aprovéchalas</footer>
    `;
    
    this.container.style.display = 'block';
  }

  /**
   * Oculta la vista principal
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      this.container.innerHTML = '';
    }
  }

  /**
   * Actualiza las estadísticas
   * @param {Object} stats - Objeto con las estadísticas
   */
  updateStats(stats) {
    const doneEl = document.getElementById('cnt-done');
    const partialEl = document.getElementById('cnt-partial');
    const missEl = document.getElementById('cnt-miss');
    const leftEl = document.getElementById('cnt-left');
    
    if (doneEl) doneEl.textContent = stats.done || 0;
    if (partialEl) partialEl.textContent = stats.partial || 0;
    if (missEl) missEl.textContent = stats.miss || 0;
    if (leftEl) leftEl.textContent = stats.left !== undefined ? Math.max(0, stats.left) : '—';
  }

  /**
   * Renderiza el grid de días
   * @param {Array} clicks - Array con el estado de cada día
   * @param {Function} onDayClick - Callback cuando se hace click en un día
   */
  renderGrid(clicks, onDayClick) {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (let i = 1; i <= this.TOTAL; i++) {
      const el = document.createElement('div');
      const locked = i < this.todayDoy;

      this.applyState(el, i, clicks, locked);

      el.addEventListener('click', () => {
        if (onDayClick) {
          onDayClick(i, locked);
        }
      });

      grid.appendChild(el);
    }
  }

  /**
   * Aplica el estado visual a un elemento del grid
   * @param {HTMLElement} el - Elemento del DOM
   * @param {number} i - Índice del día
   * @param {Array} clicks - Array con el estado de cada día
   * @param {boolean} locked - Si el día está bloqueado (pasado)
   */
  applyState(el, i, clicks, locked) {
    el.className = 'day';
    const clickValue = clicks[i] || 0;
    
    if (clickValue === 0) {
      if (locked) el.classList.add('past');
      else if (i === this.todayDoy) el.classList.add('today');
      else el.classList.add('future');
    } else {
      el.classList.add('s-' + this.states[clickValue]);
    }
  }

  /**
   * Actualiza el estado visual de un día específico
   * @param {number} dayNum - Número del día (1-365)
   * @param {Array} clicks - Array con el estado de cada día
   * @param {boolean} locked - Si el día está bloqueado
   */
  updateDayVisual(dayNum, clicks, locked) {
    const grid = document.getElementById('grid');
    if (!grid || !grid.children[dayNum - 1]) return;
    
    const el = grid.children[dayNum - 1];
    this.applyState(el, dayNum, clicks, locked);
  }

  /**
   * Establece un listener para el botón de logout
   * @param {Function} callback - Función a ejecutar al hacer logout
   */
  onLogout(callback) {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', callback);
    }
  }

  /**
   * Actualiza la información del usuario
   * @param {string} username - Nombre del usuario
   */
  setUserInfo(username) {
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
      userInfo.textContent = `Hola, ${username}`;
    }
  }
}

window.MainView = MainView;
