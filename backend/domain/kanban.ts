import { randomUUID } from 'crypto';
import type { Board, Column, Recurrence, Task, TaskOccurrence } from './types';

const DAY_COUNT = 7;
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);

type EntityId = `${string}_${string}`;

function id(prefix: string): EntityId {
  return `${prefix}_${randomUUID()}`;
}

export const MAX_BOARD_NAME = 120;
export const MAX_COLUMN_NAME = 80;
export const MAX_TASK_TITLE = 180;
export const MAX_DESCRIPTION = 2000;

/**
 * BETA-2: los ids de pizarra/columna/tarea son UUID de la BD. Un formato
 * inválido se rechaza con 400 antes de tocar la BD (evita 500 de Postgres).
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(value: unknown): string {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) throw new Error('Identificador inválido');
  return value;
}

export function normalizeName(name: unknown, max = MAX_BOARD_NAME): string {
  if (typeof name !== 'string' || !name.trim()) throw new Error('El nombre es obligatorio');
  const value = name.trim();
  if (value.length > max) throw new Error(`El nombre supera el límite de ${max} caracteres`);
  return value;
}

/** Descripciones TEXT en BD: se acotan a 2000 por higiene (el payload global ya limita a 100kb). */
export function normalizeDescription(description: unknown, max = MAX_DESCRIPTION): string | null {
  if (description === null || description === undefined) return null;
  if (typeof description !== 'string') throw new Error('La descripción es inválida');
  if (description.length > max) throw new Error(`La descripción supera el límite de ${max} caracteres`);
  return description;
}

export interface BoardDraft extends Omit<Board, 'createdAt' | 'updatedAt'> {
  columns?: never[];
}

export function createBoard({ name, ownerId, description = null, color = '#6366f1' }: {
  name?: unknown;
  ownerId?: unknown;
  description?: unknown;
  color?: unknown;
}): BoardDraft {
  if (!ownerId) throw new Error('El propietario es obligatorio');
  const safeColor = typeof color === 'string' ? color : '#6366f1';
  return {
    id: id('board'),
    name: normalizeName(name, MAX_BOARD_NAME),
    description: normalizeDescription(description),
    color: safeColor,
    ownerId: ownerId as string,
    columns: []
  };
}

export function createColumn({ boardId, name, color = '#64748b', position = 0, isDone = false, isPaused = false, wipLimit = null }: {
  boardId?: unknown;
  name?: unknown;
  color?: unknown;
  position?: unknown;
  isDone?: unknown;
  isPaused?: unknown;
  wipLimit?: unknown;
}): Column {
  if (!boardId) throw new Error('La pizarra es obligatoria');
  if (typeof position !== 'number' || !Number.isInteger(position) || position < 0) throw new Error('La posición es inválida');
  if (wipLimit !== null && (typeof wipLimit !== 'number' || !Number.isInteger(wipLimit) || wipLimit < 1)) throw new Error('El límite WIP es inválido');
  return {
    id: id('column'),
    boardId: boardId as string,
    name: normalizeName(name, MAX_COLUMN_NAME),
    color: typeof color === 'string' ? color : '#64748b',
    position,
    isDone: Boolean(isDone),
    isPaused: Boolean(isPaused),
    wipLimit
  };
}

export function moveColumn<T extends { id: string }>(columns: T[], columnId: string, targetPosition: unknown): T[] {
  if (typeof targetPosition !== 'number' || !Number.isInteger(targetPosition) || targetPosition < 0 || targetPosition >= columns.length) throw new Error('La posición es inválida');
  const index = columns.findIndex(column => column.id === columnId);
  if (index < 0) throw new Error('Estado no encontrado');
  const result = columns.slice();
  const [column] = result.splice(index, 1);
  result.splice(targetPosition, 0, column);
  return result.map((item, position) => ({ ...item, position }));
}

export function validateRecurrence(recurrence?: unknown): Recurrence {
  if (!recurrence) return { type: 'none', days: [] };
  const candidate = recurrence as { type?: unknown; days?: unknown };
  if (candidate.type === 'none') return { type: 'none', days: [] };
  if (candidate.type !== 'weekly') throw new Error('Tipo de frecuencia inválido');
  const rawDays: unknown[] = Array.isArray(candidate.days) ? candidate.days : [];
  const days = [...new Set(rawDays)].sort((a, b) => Number(a) - Number(b)) as number[];
  if (!days.length) throw new Error('Debe seleccionar al menos un día');
  if (days.some(day => typeof day !== 'number' || !Number.isInteger(day) || day < 1 || day > DAY_COUNT)) throw new Error('Día de frecuencia inválido');
  return { type: 'weekly', days };
}

export function createTask({
  boardId, columnId, title, description = null, assigneeId = null, priority = 'medium',
  effortPoints = null, estimatedMinutes = null, dueDate = null, dueTime = null, tags = [], recurrence = null
}: {
  boardId?: unknown;
  columnId?: unknown;
  title?: unknown;
  description?: unknown;
  assigneeId?: unknown;
  priority?: unknown;
  effortPoints?: unknown;
  estimatedMinutes?: unknown;
  dueDate?: unknown;
  dueTime?: unknown;
  tags?: unknown;
  recurrence?: unknown;
}): Omit<Task, 'id'> & { id: EntityId } {
  if (!boardId || !columnId) throw new Error('La pizarra y el estado son obligatorios');
  const normalizedTitle = normalizeName(title, MAX_TASK_TITLE);
  if (typeof priority !== 'string' || !VALID_PRIORITIES.has(priority)) throw new Error('Prioridad inválida');
  if (effortPoints !== null && (typeof effortPoints !== 'number' || !Number.isInteger(effortPoints) || effortPoints < 1)) throw new Error('Los puntos son inválidos');
  if (estimatedMinutes !== null && (typeof estimatedMinutes !== 'number' || !Number.isInteger(estimatedMinutes) || estimatedMinutes < 1)) throw new Error('La duración estimada es inválida');
  if (dueTime !== null && (typeof dueTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime))) throw new Error('La hora es inválida');
  if (dueDate !== null && (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate))) throw new Error('La fecha es inválida');
  const rawTags: unknown[] = Array.isArray(tags) ? tags : [];
  return {
    id: id('task'),
    boardId: boardId as string,
    columnId: columnId as string,
    title: normalizedTitle,
    description: normalizeDescription(description),
    assigneeId: (assigneeId ?? null) as string | null,
    priority: priority as Task['priority'],
    effortPoints,
    estimatedMinutes,
    dueDate,
    dueTime,
    tags: [...new Set(rawTags.filter((tag): tag is string => typeof tag === 'string').map(tag => tag.trim()).filter(Boolean))],
    recurrence: validateRecurrence(recurrence),
    archivedAt: null,
    completedAt: null
  };
}

function parseDate(date: string): Date {
  const value = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(value.getTime())) throw new Error('Fecha inválida');
  return value;
}

function isoWeekday(date: string): number {
  const day = parseDate(date).getUTCDay();
  return day === 0 ? 7 : day;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Días ISO 1-7 (lunes-domingo). Devuelve el primer día posterior a `date`. */
export function getNextOccurrenceDate(date: string, days: number[]): string {
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

export function completeOccurrence({ task, occurrence, doneColumnId, now = new Date() }: {
  task: { id: string; columnId?: string; recurrence?: Recurrence | null };
  occurrence: Partial<TaskOccurrence> & Pick<TaskOccurrence, 'date'>;
  doneColumnId: string;
  now?: Date;
}): {
  completed: Partial<TaskOccurrence> & Pick<TaskOccurrence, 'date'> & { status: string; columnId: string; completedAt: string };
  next: Omit<TaskOccurrence, 'id' | 'completedAt'> & { id: EntityId } | null;
} {
  if (!task || !occurrence) throw new Error('Tarea y ocurrencia son obligatorias');
  const completed = { ...occurrence, status: 'done', columnId: doneColumnId, completedAt: now.toISOString() };
  if (task.recurrence?.type !== 'weekly') return { completed, next: null };
  const nextDate = getNextOccurrenceDate(occurrence.date, task.recurrence.days);
  return {
    completed,
    next: { id: id('occ'), taskId: task.id, date: nextDate, status: 'todo', columnId: task.columnId as string }
  };
}

interface LegacyTransitionTask {
  archivedAt?: string | null;
  status?: string | null;
  completedAt?: string | null;
  recurrence?: Recurrence | null;
  [key: string]: unknown;
}

export function transitionTasksForDate<T extends LegacyTransitionTask>(tasks: T[], today: string): T[] {
  return tasks.map(task => {
    if (task.archivedAt || task.status !== 'done' || !task.completedAt) return task;
    const completedDate = task.completedAt.slice(0, 10);
    if (completedDate >= today) return task;
    if (task.recurrence?.type === 'weekly') return task;
    return { ...task, archivedAt: today };
  });
}

export function canNotifyTask(task: unknown): boolean {
  if (!task || typeof task !== 'object') return false;
  const candidate = task as { archivedAt?: unknown; status?: { isPaused?: unknown; isDone?: unknown } | null };
  return Boolean(candidate && !candidate.archivedAt && !candidate.status?.isPaused && candidate.status?.isDone !== true);
}

export function calculateTaskEffort({ effortPoints = null, estimatedMinutes = null }: {
  effortPoints?: number | null;
  estimatedMinutes?: number | null;
}): { effortPoints: number | null; estimatedMinutes: number | null } {
  return { effortPoints, estimatedMinutes };
}
