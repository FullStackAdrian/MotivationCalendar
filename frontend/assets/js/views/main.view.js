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

    // Calcular día del año actual
    const today = new Date();
    const yr = today.getFullYear();
    if (yr === 2026) {
      this.todayDoy = Math.floor((today - new Date(2026, 0, 1)) / 86400000) + 1;
    } else {
      this.todayDoy = yr < 2026 ? 0 : 366;
    }
    this.states = [null, 'done', 'partial', 'miss'];
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
          <span id="user-info"></span>
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

    this.setUserInfo(user?.username || '');
    this.container.style.display = 'block';
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      this.container.innerHTML = '';
    }
  }

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

  updateDayVisual(dayNum, clicks, locked) {
    const grid = document.getElementById('grid');
    if (!grid || !grid.children[dayNum - 1]) return;

    const el = grid.children[dayNum - 1];
    this.applyState(el, dayNum, clicks, locked);
  }

  onLogout(callback) {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', callback);
    }
  }

  setUserInfo(username) {
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
      userInfo.textContent = `Hola, ${username}`;
    }
  }
}

window.MainView = MainView;
