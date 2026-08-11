class KanbanView {
  constructor(container) { this.container = container; }

  show(user, boards, selectedBoard) {
    this.container.innerHTML = `
      <section class="kanban-shell">
        <header class="kanban-header">
          <div>
            <button id="kanban-back" class="kanban-link">← Calendario</button>
            <h1>Kanban</h1>
            <p>Organiza el trabajo sin perder de vista el día.</p>
          </div>
          <div class="kanban-actions">
            <select id="board-select" aria-label="Pizarra"></select>
            <button id="new-board" class="kanban-primary">+ Pizarra</button>
            <button id="new-task" class="kanban-primary">+ Tarea</button>
            <button id="show-archive" class="kanban-secondary">📦 Archivo</button>
          </div>
        </header>
        <div id="kanban-board" class="kanban-board"></div>
        <div id="kanban-modal" class="kanban-modal hidden"></div>
      </section>`;
    this.renderBoards(boards, selectedBoard);
    const userLabel = user?.username ? document.createElement('span') : null;
    if (userLabel) userLabel.textContent = user.username;
  }

  renderBoards(boards, selected) {
    const select = document.getElementById('board-select');
    if (!select) return;
    select.innerHTML = boards.map(board => `<option value="${this.escape(board.id)}">${this.escape(board.name)}</option>`).join('');
    if (selected) select.value = selected.id;
  }

  renderBoard(board, onDrop, onEditColumn) {
    const root = document.getElementById('kanban-board');
    if (!root) return;
    const columns = [...(board.columns || [])].sort((a, b) => a.position - b.position);
    const tasks = (board.tasks || []).filter(task => !task.archivedAt);
    root.innerHTML = columns.map(column => {
      const cards = tasks.filter(task => task.columnId === column.id).map(task => this.taskCard(task, column)).join('');
      return `<article class="kanban-column" data-column-id="${this.escape(column.id)}" draggable="true">
        <div class="kanban-column-head"><span class="status-dot" style="background:${this.escape(column.color)}"></span><strong>${this.escape(column.name)}</strong><span>${tasks.filter(t => t.columnId === column.id).length}</span><button class="column-edit" data-column-id="${this.escape(column.id)}">•••</button></div>
        <div class="kanban-cards" data-drop-column="${this.escape(column.id)}">${cards || '<div class="kanban-empty">Sin tareas</div>'}</div>
      </article>`;
    }).join('');
    root.querySelectorAll('.kanban-card').forEach(card => card.addEventListener('dragstart', event => event.dataTransfer.setData('text/plain', card.dataset.taskId)));
    root.querySelectorAll('.kanban-cards').forEach(zone => {
      zone.addEventListener('dragover', event => event.preventDefault());
      zone.addEventListener('drop', event => onDrop(event.dataTransfer.getData('text/plain'), zone.dataset.dropColumn));
    });
    root.querySelectorAll('.column-edit').forEach(button => button.addEventListener('click', () => onEditColumn(button.dataset.columnId)));
  }

  taskCard(task, column) {
    const recurrence = task.recurrence?.type === 'weekly' ? `↻ ${task.recurrence.days.map(this.dayName).join(' · ')}` : '';
    const points = task.effortPoints ? `⭐ ${task.effortPoints}` : '';
    const time = task.estimatedMinutes ? `⏱ ${task.estimatedMinutes}m` : '';
    const tags = (task.tags || []).map(tag => `<span class="kanban-tag">${this.escape(tag)}</span>`).join('');
    const assignee = task.assignee ? `👤 ${this.escape(task.assignee.username)}` : '👤 Sin asignar';
    return `<div class="kanban-card" draggable="true" data-task-id="${this.escape(task.id)}">
      <div class="task-title">${this.escape(task.title)}</div>
      <div class="task-meta"><span class="priority-${this.escape(task.priority)}">${this.escape(task.priority)}</span>${assignee}</div>
      <div class="task-tags">${tags}</div>
      <div class="task-footer"><span>${points}</span><span>${time}</span><span>${recurrence}</span></div>
      <span class="task-status" style="background:${this.escape(column.color)}">${this.escape(column.name)}</span>
    </div>`;
  }

  showTaskForm(columns, users = []) {
    const modal = document.getElementById('kanban-modal');
    modal.classList.remove('hidden');
    modal.innerHTML = `<form id="task-form" class="kanban-form"><button type="button" class="modal-close">×</button><h2>Nueva tarea</h2>
      <label>Título<input name="title" required maxlength="180"></label>
      <label>Estado<select name="columnId">${columns.map(c => `<option value="${this.escape(c.id)}">${this.escape(c.name)}</option>`).join('')}</select></label>
      <label>Asignar a<select name="assigneeId"><option value="">Sin asignar</option>${users.map(u => `<option value="${this.escape(u.id)}">${this.escape(u.username)}</option>`).join('')}</select></label>
      <label>Prioridad<select name="priority"><option value="low">Baja</option><option value="medium" selected>Media</option><option value="high">Alta</option></select></label>
      <div class="form-grid"><label>Puntos<input name="effortPoints" type="number" min="1"></label><label>Minutos estimados<input name="estimatedMinutes" type="number" min="1"></label></div>
      <div class="form-grid"><label>Fecha<input name="dueDate" type="date"></label><label>Hora<input name="dueTime" type="time"></label></div>
      <label>Frecuencia<select name="recurrenceType" id="recurrence-type"><option value="none">Sin frecuencia</option><option value="weekly">Semanal</option></select></label>
      <div id="weekday-picker" class="weekday-picker hidden">${[['1','L'],['2','M'],['3','X'],['4','J'],['5','V'],['6','S'],['7','D']].map(([value,label]) => `<label><input type="checkbox" name="days" value="${value}">${label}</label>`).join('')}</div>
      <label>Tags<input name="tags" placeholder="backend, urgente"></label>
      <button class="kanban-primary" type="submit">Crear tarea</button></form>`;
    document.getElementById('recurrence-type').addEventListener('change', e => document.getElementById('weekday-picker').classList.toggle('hidden', e.target.value !== 'weekly'));
  }

  showBoardForm() {
    const modal = document.getElementById('kanban-modal');
    modal.classList.remove('hidden');
    modal.innerHTML = `<form id="board-form" class="kanban-form"><button type="button" class="modal-close">×</button><h2>Nueva pizarra</h2><label>Nombre<input name="name" required maxlength="120"></label><label>Descripción<textarea name="description"></textarea></label><button class="kanban-primary" type="submit">Crear pizarra</button></form>`;
  }

  showArchive(tasks) {
    const modal = document.getElementById('kanban-modal');
    modal.classList.remove('hidden');
    modal.innerHTML = `<div class="kanban-form archive-list"><button type="button" class="modal-close">×</button><h2>Archivo</h2>${tasks.length ? tasks.map(t => `<article><strong>${this.escape(t.title)}</strong><span>📦 ${this.escape(t.archivedAt || '')}</span></article>`).join('') : '<p>No hay tareas archivadas.</p>'}</div>`;
  }

  closeModal() { const modal = document.getElementById('kanban-modal'); if (modal) modal.classList.add('hidden'); }
  onBack(callback) { document.getElementById('kanban-back')?.addEventListener('click', callback); }
  onBoardChange(callback) { document.getElementById('board-select')?.addEventListener('change', e => callback(e.target.value)); }
  onNewBoard(callback) { document.getElementById('new-board')?.addEventListener('click', callback); }
  onNewTask(callback) { document.getElementById('new-task')?.addEventListener('click', callback); }
  onArchive(callback) { document.getElementById('show-archive')?.addEventListener('click', callback); }
  onModalSubmit(selector, callback) { document.querySelector(selector)?.addEventListener('submit', event => { event.preventDefault(); callback(new FormData(event.target)); }); }
  onModalClose() { document.querySelector('.modal-close')?.addEventListener('click', () => this.closeModal()); }
  escape(value) { return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char])); }
  dayName(day) { return ['','L','M','X','J','V','S','D'][day] || '?'; }
}

window.KanbanView = KanbanView;
