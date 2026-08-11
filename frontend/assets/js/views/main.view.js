class MainView {
  constructor(container) {
    this.container = container;
    this.TOTAL = 365;
    const today = new Date();
    const yr = today.getFullYear();
    this.todayDoy = yr === 2026 ? Math.floor((today - new Date(2026, 0, 1)) / 86400000) + 1 : (yr < 2026 ? 0 : 366);
    this.states = [null, 'done', 'partial', 'miss'];
  }

  show(user) {
    if (!this.container) return;
    this.container.innerHTML = `
      <div id="calendar-view">
        <header>
          <div class="user-header"><span id="user-info"></span><div class="main-nav"><button id="kanban-btn" class="btn-nav">📋 Kanban</button><button id="logout-btn" class="btn-logout">Salir</button></div></div>
          <div class="year">2026</div><div class="tagline">Cada día que pasa, ya no vuelve</div>
        </header>
        <div class="stats">
          <div class="stat"><div class="stat-n" id="cnt-done">0</div><div class="stat-label"><span class="dot" style="background:var(--done)"></span>Todo bien</div></div>
          <div class="stat"><div class="stat-n" id="cnt-partial">0</div><div class="stat-label"><span class="dot" style="background:var(--partial)"></span>A medias</div></div>
          <div class="stat"><div class="stat-n" id="cnt-miss">0</div><div class="stat-label"><span class="dot" style="background:var(--miss)"></span>Sin cumplir</div></div>
          <div class="stat"><div class="stat-n" id="cnt-left">—</div><div class="stat-label">Días restantes</div></div>
        </div>
        <div class="grid" id="grid"></div>
        <div class="legend"><div class="legend-item"><div class="swatch sw-past"></div>Pasado sin marcar</div><div class="legend-item"><div class="swatch sw-future"></div>Por venir</div><div class="legend-item"><div class="swatch sw-done"></div>Todo bien</div><div class="legend-item"><div class="swatch sw-partial"></div>A medias</div><div class="legend-item"><div class="swatch sw-miss"></div>Sin cumplir</div></div>
        <footer>365 oportunidades &nbsp;·&nbsp; Aprovéchalas</footer>
      </div>`;
    this.setUserInfo(user?.username || '');
    this.container.style.display = 'block';
  }

  hide() { if (this.container) { this.container.style.display = 'none'; this.container.innerHTML = ''; } }
  updateStats(stats) {
    const map = { done: 'cnt-done', partial: 'cnt-partial', miss: 'cnt-miss', left: 'cnt-left' };
    Object.entries(map).forEach(([key, id]) => { const el = document.getElementById(id); if (el) el.textContent = key === 'left' ? Math.max(0, stats[key] ?? 0) : (stats[key] || 0); });
  }
  renderGrid(clicks, onDayClick) {
    const grid = document.getElementById('grid'); if (!grid) return; grid.innerHTML = '';
    for (let i = 1; i <= this.TOTAL; i++) {
      const el = document.createElement('div'); const locked = i < this.todayDoy; this.applyState(el, i, clicks, locked);
      el.addEventListener('click', () => onDayClick?.(i, locked)); grid.appendChild(el);
    }
  }
  applyState(el, i, clicks, locked) {
    el.className = 'day'; const clickValue = clicks[i] || 0;
    if (clickValue === 0) el.classList.add(locked ? 'past' : (i === this.todayDoy ? 'today' : 'future'));
    else el.classList.add('s-' + this.states[clickValue]);
  }
  updateDayVisual(dayNum, clicks, locked) { const grid = document.getElementById('grid'); if (!grid?.children[dayNum - 1]) return; this.applyState(grid.children[dayNum - 1], dayNum, clicks, locked); }
  onLogout(callback) { document.getElementById('logout-btn')?.addEventListener('click', callback); }
  onKanban(callback) { document.getElementById('kanban-btn')?.addEventListener('click', callback); }
  setUserInfo(username) { const el = document.getElementById('user-info'); if (el) el.textContent = `Hola, ${username}`; }
}
window.MainView = MainView;
