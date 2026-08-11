const crypto = require('crypto');

const DAY_COUNT = 7;
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);

const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;

function normalizeName(name) {
  if (typeof name !== 'string' || !name.trim()) throw new Error('El nombre es obligatorio');
  return name.trim();
}

function createBoard({ name, ownerId, description = null, color = '#6366f1' }) {
  if (!ownerId) throw new Error('El propietario es obligatorio');
  return { id: id('board'), name: normalizeName(name), description, color, ownerId, columns: [] };
}

function createColumn({ boardId, name, color = '#64748b', position = 0, isDone = false, isPaused = false, wipLimit = null }) {
  if (!boardId) throw new Error('La pizarra es obligatoria');
  if (!Number.isInteger(position) || position < 0) throw new Error('La posición es inválida');
  if (wipLimit !== null && (!Number.isInteger(wipLimit) || wipLimit < 1)) throw new Error('El límite WIP es inválido');
  return { id: id('column'), boardId, name: normalizeName(name), color, position, isDone: Boolean(isDone), isPaused: Boolean(isPaused), wipLimit };
}

function moveColumn(columns, columnId, targetPosition) {
  if (!Number.isInteger(targetPosition) || targetPosition < 0 || targetPosition >= columns.length) throw new Error('La posición es inválida');
  const index = columns.findIndex(column => column.id === columnId);
  if (index < 0) throw new Error('Estado no encontrado');
  const result = columns.slice();
  const [column] = result.splice(index, 1);
  result.splice(targetPosition, 0, column);
  return result.map((item, position) => ({ ...item, position }));
}

function validateRecurrence(recurrence) {
  if (!recurrence) return { type: 'none', days: [] };
  if (recurrence.type === 'none') return { type: 'none', days: [] };
  if (recurrence.type !== 'weekly') throw new Error('Tipo de frecuencia inválido');
  const days = [...new Set(recurrence.days || [])].sort((a, b) => a - b);
  if (!days.length) throw new Error('Debe seleccionar al menos un día');
  if (days.some(day => !Number.isInteger(day) || day < 1 || day > DAY_COUNT)) throw new Error('Día de frecuencia inválido');
  return { type: 'weekly', days };
}

function createTask({
  boardId, columnId, title, description = null, assigneeId = null, priority = 'medium',
  effortPoints = null, estimatedMinutes = null, dueDate = null, dueTime = null, tags = [], recurrence = null
}) {
  if (!boardId || !columnId) throw new Error('La pizarra y el estado son obligatorios');
  const normalizedTitle = normalizeName(title);
  if (!VALID_PRIORITIES.has(priority)) throw new Error('Prioridad inválida');
  if (effortPoints !== null && (!Number.isInteger(effortPoints) || effortPoints < 1)) throw new Error('Los puntos son inválidos');
  if (estimatedMinutes !== null && (!Number.isInteger(estimatedMinutes) || estimatedMinutes < 1)) throw new Error('La duración estimada es inválida');
  if (dueTime !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) throw new Error('La hora es inválida');
  if (dueDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error('La fecha es inválida');
  return {
    id: id('task'), boardId, columnId, title: normalizedTitle, description, assigneeId,
    priority, effortPoints, estimatedMinutes, dueDate, dueTime,
    tags: [...new Set(tags.filter(tag => typeof tag === 'string').map(tag => tag.trim()).filter(Boolean))],
    recurrence: validateRecurrence(recurrence), archivedAt: null, completedAt: null
  };
}

function parseDate(date) {
  const value = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(value.getTime())) throw new Error('Fecha inválida');
  return value;
}

function isoWeekday(date) {
  const day = parseDate(date).getUTCDay();
  return day === 0 ? 7 : day;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getNextOccurrenceDate(date, days) {
  const selected = [...days].sort((a, b) => a - b);
  if (!selected.length) throw new Error('Debe existir al menos un día de frecuencia');
  const cursor = parseDate(date);
  for (let offset = 1; offset <= DAY_COUNT; offset += 1) {
    const next = new Date(cursor);
    next.setUTCDate(next.getUTCDate() + offset);
    if (selected.includes(isoWeekday(formatDate(next)))) return formatDate(next);
  }
  throw new Error('No se pudo calcular la siguiente ocurrencia');
}

function completeOccurrence({ task, occurrence, doneColumnId, now = new Date() }) {
  if (!task || !occurrence) throw new Error('Tarea y ocurrencia son obligatorias');
  const completed = { ...occurrence, status: 'done', columnId: doneColumnId, completedAt: now.toISOString() };
  if (task.recurrence?.type !== 'weekly') return { completed, next: null };
  const nextDate = getNextOccurrenceDate(occurrence.date, task.recurrence.days);
  return {
    completed,
    next: { id: id('occ'), taskId: task.id, date: nextDate, status: 'todo', columnId: task.columnId }
  };
}

function transitionTasksForDate(tasks, today) {
  return tasks.map(task => {
    if (task.archivedAt || task.status !== 'done' || !task.completedAt) return task;
    const completedDate = task.completedAt.slice(0, 10);
    if (completedDate >= today) return task;
    if (task.recurrence?.type === 'weekly') return task;
    return { ...task, archivedAt: today };
  });
}

function canNotifyTask(task) {
  return Boolean(task && !task.archivedAt && !task.status?.isPaused && task.status?.isDone !== true);
}

function calculateTaskEffort({ effortPoints = null, estimatedMinutes = null }) {
  return { effortPoints, estimatedMinutes };
}

module.exports = {
  createBoard,
  createColumn,
  moveColumn,
  createTask,
  validateRecurrence,
  getNextOccurrenceDate,
  completeOccurrence,
  transitionTasksForDate,
  canNotifyTask,
  calculateTaskEffort
};
