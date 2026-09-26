/**
 * DTOs del dominio: contratos puros que viajan entre capas.
 * Convención de fechas: lectura `string | null` (formato JSON),
 * escritura admite `Date` (los adaptadores la persisten).
 */
export interface Recurrence {
  type: 'none' | 'weekly';
  days: number[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  /** Hash bcrypt. Solo presente en filas leídas de persistencia; nunca en respuestas. */
  password?: string;
  createdAt?: string | Date | null;
}

export type MemberUser = Pick<User, 'id' | 'username' | 'email'>;

export interface Board {
  id: string;
  name: string;
  description: string | null;
  color: string;
  ownerId: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  color: string;
  position: number;
  isDone: boolean;
  isPaused: boolean;
  wipLimit: number | null;
}

export interface TaskOccurrence {
  id: string;
  taskId: string;
  date: string;
  status: string;
  columnId: string;
  completedAt: string | null;
}

export type Priority = 'low' | 'medium' | 'high';

export type ProgressStatus = 'completed' | 'partial' | 'failed';

export interface Task {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  priority: Priority;
  effortPoints: number | null;
  estimatedMinutes: number | null;
  dueDate: string | null;
  dueTime: string | null;
  tags: string[];
  recurrence: Recurrence;
  completedAt: Date | string | null;
  archivedAt: string | null;
}

export interface TaskWithRelations extends Task {
  assignee?: MemberUser | null;
  occurrences: TaskOccurrence[];
}

export interface BoardWithDetails extends Board {
  columns: Column[];
  tasks: TaskWithRelations[];
}

export interface BoardMemberRow {
  boardId: string;
  userId: string;
  role: string;
}

/** Entradas crudas (cuerpos HTTP): el runtime las valida en la entidad. */
export interface CreateBoardInput {
  name?: unknown;
  ownerId?: unknown;
  description?: unknown;
  color?: unknown;
}

export interface CreateColumnInput {
  boardId?: unknown;
  name?: unknown;
  color?: unknown;
  position?: unknown;
  isDone?: unknown;
  isPaused?: unknown;
  wipLimit?: unknown;
}

export interface CreateTaskInput {
  title?: unknown;
  columnId?: unknown;
  assigneeId?: unknown;
  description?: unknown;
  priority?: unknown;
  effortPoints?: unknown;
  estimatedMinutes?: unknown;
  dueDate?: unknown;
  dueTime?: unknown;
  tags?: unknown;
  recurrence?: unknown;
}

export type ColumnPatch = Partial<Pick<Column, 'name' | 'color' | 'isDone' | 'isPaused' | 'wipLimit'>>;

export interface TaskPatch {
  columnId?: string;
  completedAt?: Date | string | null;
  archivedAt?: string | null;
}

export interface OccurrencePatch {
  columnId: string;
  status: 'todo' | 'done';
  completedAt: Date | null;
}

export interface NewUserData {
  username: string;
  email: string;
  passwordHash: string;
}
