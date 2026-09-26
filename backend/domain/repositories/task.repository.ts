import type { OccurrencePatch, Task, TaskOccurrence, TaskPatch } from '../types';

/**
 * Puerto de persistencia de tareas y sus ocurrencias.
 */
export interface TaskRepository {
  findById(taskId: string): Promise<Task | null>;
  /** Tareas no archivadas de la pizarra. */
  listActiveByBoard(boardId: string): Promise<Task[]>;
  /** Tareas archivadas con filtros. */
  listArchived(boardId: string, filters?: { assigneeId?: string }): Promise<Task[]>;
  /** Tareas activas en una columna (para límites WIP). */
  countActiveInColumn(boardId: string, columnId: string): Promise<number>;
  create(data: Omit<Task, 'id'>): Promise<Task>;
  /** Actualiza campos y devuelve la fila resultante. */
  update(taskId: string, patch: TaskPatch): Promise<Task | null>;

  // --- Ocurrencias ---

  findOccurrenceByTaskAndDate(taskId: string, date: string): Promise<TaskOccurrence | null>;
  /** Ocurrencia 'todo' más antigua de la tarea. */
  findFirstTodoOccurrence(taskId: string): Promise<TaskOccurrence | null>;
  createOccurrence(data: { taskId: string; date: string; status: string; columnId: string }): Promise<TaskOccurrence>;
  /** Crea la ocurrencia si no existe para esa fecha. */
  findOrCreateNextOccurrence(taskId: string, date: string, defaults: { status: string; columnId: string }): Promise<TaskOccurrence>;
  /** Actualiza la ocurrencia y devuelve la fila resultante. */
  updateOccurrence(occurrenceId: string, patch: OccurrencePatch): Promise<TaskOccurrence | null>;
}
