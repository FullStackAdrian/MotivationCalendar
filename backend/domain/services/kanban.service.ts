/**
 * Servicio de kanban (dominio).
 * Orquesta la entidad kanban y los puertos de repositorio.
 * Reglas de negocio aquí; mecánica de persistencia en los adaptadores.
 */
import {
  createBoard,
  createColumn,
  createTask,
  getNextOccurrenceDate,
  moveColumn,
  validateRecurrence
} from '../kanban';
import type { BoardRepository } from '../repositories/board.repository';
import type { ColumnRepository } from '../repositories/column.repository';
import type { TaskRepository } from '../repositories/task.repository';
import type { UserRepository } from '../repositories/user.repository';
import type {
  Board,
  BoardMemberRow,
  BoardWithDetails,
  Column,
  ColumnPatch,
  CreateBoardInput,
  CreateColumnInput,
  CreateTaskInput,
  MemberUser,
  Task,
  TaskPatch
} from '../types';

const DEFAULT_COLUMNS = [
  { name: 'Todo', color: '#3b82f6' },
  { name: 'En progreso', color: '#f59e0b' },
  { name: 'Pausa', color: '#64748b', isPaused: true },
  { name: 'Done', color: '#22c55e', isDone: true }
];

export interface KanbanServiceDependencies {
  userRepository: UserRepository;
  boardRepository: BoardRepository;
  columnRepository: ColumnRepository;
  taskRepository: TaskRepository;
}

export class KanbanService {
  private readonly userRepository: UserRepository;
  private readonly boardRepository: BoardRepository;
  private readonly columnRepository: ColumnRepository;
  private readonly taskRepository: TaskRepository;

  constructor({ userRepository, boardRepository, columnRepository, taskRepository }: KanbanServiceDependencies) {
    this.userRepository = userRepository;
    this.boardRepository = boardRepository;
    this.columnRepository = columnRepository;
    this.taskRepository = taskRepository;
  }

  async isMember(boardId: string, userId: string): Promise<boolean> {
    return this.boardRepository.hasAccess(boardId, userId);
  }

  async createBoard(userId: string, data: CreateBoardInput): Promise<BoardWithDetails> {
    const value = createBoard({ ...data, ownerId: userId });
    delete (value as Partial<BoardDraft>).id;
    delete value.columns;
    const board = await this.boardRepository.createWithDefaults(
      value as Pick<Board, 'name' | 'description' | 'color' | 'ownerId'>,
      userId,
      DEFAULT_COLUMNS
    );
    return this.getBoard(board.id, userId);
  }

  async listBoards(userId: string): Promise<Board[]> {
    return this.boardRepository.listVisibleByUser(userId);
  }

  async getBoard(boardId: string, userId: string, today: string = new Date().toISOString().slice(0, 10)): Promise<BoardWithDetails> {
    if (!(await this.boardRepository.hasAccess(boardId, userId))) throw new Error('No autorizado');
    await this.synchronizeBoard(boardId, today);
    const board = await this.boardRepository.findByIdWithDetails(boardId);
    if (!board) throw new Error('Estado no encontrado');
    return board;
  }

  async listMembers(boardId: string, userId: string): Promise<MemberUser[]> {
    if (!(await this.boardRepository.hasAccess(boardId, userId))) throw new Error('No autorizado');
    return this.boardRepository.listMemberUsers(boardId);
  }

  async addMember(boardId: string, ownerId: string, userId: string): Promise<BoardMemberRow | null> {
    if (!(await this.boardRepository.isOwner(boardId, ownerId))) throw new Error('No autorizado');
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('Usuario no encontrado');
    const { member } = await this.boardRepository.addMemberIfAbsent(boardId, userId, 'member');
    return member;
  }

  async createColumn(boardId: string, userId: string, data: CreateColumnInput): Promise<Column> {
    if (!(await this.boardRepository.hasAccess(boardId, userId))) throw new Error('No autorizado');
    const count = await this.columnRepository.countByBoard(boardId);
    const value = createColumn({ ...data, boardId, position: data.position ?? count });
    delete (value as { id?: string }).id;
    return this.columnRepository.create(value);
  }

  async reorderColumn(boardId: string, userId: string, columnId: string, targetPosition: unknown): Promise<Column[]> {
    if (!(await this.boardRepository.hasAccess(boardId, userId))) throw new Error('No autorizado');
    const columns = await this.columnRepository.listByBoardOrdered(boardId);
    const reordered = moveColumn(columns, columnId, targetPosition);
    await this.columnRepository.updatePositions(reordered.map(column => ({ id: column.id, position: column.position })));
    return reordered;
  }

  async updateColumn(columnId: string, userId: string, data: Record<string, unknown>): Promise<Column | null> {
    const column = await this.columnRepository.findById(columnId);
    if (!column || !(await this.boardRepository.hasAccess(column.boardId, userId))) throw new Error('No autorizado');
    const allowed: Array<keyof ColumnPatch> = ['name', 'color', 'isDone', 'isPaused', 'wipLimit'];
    const patch: ColumnPatch = {};
    for (const key of allowed) {
      if (data[key] !== undefined) patch[key] = data[key] as never;
    }
    return this.columnRepository.update(columnId, patch);
  }

  async createTask(boardId: string, userId: string, data: CreateTaskInput): Promise<Task> {
    if (!(await this.boardRepository.hasAccess(boardId, userId))) throw new Error('No autorizado');
    if (data.assigneeId && !(await this.boardRepository.isMemberRow(boardId, data.assigneeId as string))) {
      throw new Error('El usuario asignado no pertenece a la pizarra');
    }
    const column = await this.columnRepository.findByIdInBoard(data.columnId as string, boardId);
    if (!column) throw new Error('Estado no encontrado');
    const recurrence = validateRecurrence(data.recurrence);
    const value = createTask({ ...data, boardId, recurrence });
    delete (value as { id?: string }).id;
    const task = await this.taskRepository.create(value);
    const firstDate = (data.dueDate as string | null) || this.nextScheduledDate(recurrence, new Date().toISOString().slice(0, 10));
    if (firstDate) {
      await this.taskRepository.createOccurrence({ taskId: task.id, date: firstDate, status: 'todo', columnId: column.id });
    }
    return task;
  }

  nextScheduledDate(recurrence: Task['recurrence'], today: string): string | null {
    if (recurrence.type !== 'weekly') return null;
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay() || 7;
    if (recurrence.days.includes(weekday)) return today;
    return getNextOccurrenceDate(today, recurrence.days);
  }

  async moveTask(taskId: string, userId: string, columnId: string): Promise<Task | null> {
    const task = await this.taskRepository.findById(taskId);
    if (!task || !(await this.boardRepository.hasAccess(task.boardId, userId))) throw new Error('No autorizado');
    const column = await this.columnRepository.findByIdInBoard(columnId, task.boardId);
    if (!column) throw new Error('Estado no encontrado');
    if (column.wipLimit !== null) {
      const count = await this.taskRepository.countActiveInColumn(task.boardId, columnId);
      if (task.columnId !== columnId && count >= column.wipLimit) throw new Error('Límite WIP alcanzado');
    }
    const patch: TaskPatch = { columnId };
    patch.completedAt = column.isDone ? new Date() : null;
    return this.taskRepository.update(task.id, patch);
  }

  async moveTaskOccurrence(taskId: string, userId: string, columnId: string, date: string): Promise<Task | import('../types').TaskOccurrence | null> {
    const task = await this.taskRepository.findById(taskId);
    if (!task || !(await this.boardRepository.hasAccess(task.boardId, userId))) throw new Error('No autorizado');
    if (task.recurrence?.type !== 'weekly') {
      return this.moveTask(taskId, userId, columnId);
    }
    const column = await this.columnRepository.findByIdInBoard(columnId, task.boardId);
    if (!column) throw new Error('Estado no encontrado');
    const occurrence = await this.taskRepository.findOccurrenceByTaskAndDate(task.id, date);
    if (!occurrence) throw new Error('Ocurrencia no encontrada');
    return this.taskRepository.updateOccurrence(occurrence.id, {
      columnId: column.id,
      status: column.isDone ? 'done' : 'todo',
      completedAt: column.isDone ? new Date() : null
    });
  }

  async completeTask(taskId: string, userId: string, today: string = new Date().toISOString().slice(0, 10)): Promise<Task | null> {
    const task = await this.taskRepository.findById(taskId);
    if (!task || !(await this.boardRepository.hasAccess(task.boardId, userId))) throw new Error('No autorizado');
    const doneColumn = await this.columnRepository.findDoneByBoard(task.boardId);
    if (!doneColumn) throw new Error('La pizarra no tiene estado Done');
    const previousColumnId = task.columnId;
    const updated = await this.taskRepository.update(task.id, { columnId: doneColumn.id, completedAt: new Date() });
    if (task.recurrence.type === 'weekly') {
      const nextDate = getNextOccurrenceDate(today, task.recurrence.days);
      await this.taskRepository.findOrCreateNextOccurrence(task.id, nextDate, { status: 'todo', columnId: previousColumnId });
    }
    return updated;
  }

  async synchronizeBoard(boardId: string, today: string): Promise<void> {
    const tasks = await this.taskRepository.listActiveByBoard(boardId);
    for (const task of tasks) {
      if (task.recurrence.type === 'weekly') {
        const nextDate = this.nextScheduledDate(task.recurrence, today);
        if (nextDate) {
          const existing = await this.taskRepository.findOccurrenceByTaskAndDate(task.id, nextDate);
          if (!existing) {
            const firstTodo = await this.taskRepository.findFirstTodoOccurrence(task.id);
            await this.taskRepository.createOccurrence({
              taskId: task.id,
              date: nextDate,
              status: 'todo',
              columnId: firstTodo?.columnId || task.columnId
            });
          }
        }
        continue;
      }
      const completedDay = task.completedAt ? new Date(task.completedAt).toISOString().slice(0, 10) : null;
      if (completedDay && completedDay < today) {
        await this.taskRepository.update(task.id, { archivedAt: today });
      }
    }
  }

  async listArchive(boardId: string, userId: string, filters: { assigneeId?: string } = {}): Promise<Task[]> {
    if (!(await this.boardRepository.hasAccess(boardId, userId))) throw new Error('No autorizado');
    return this.taskRepository.listArchived(boardId, filters);
  }
}

type BoardDraft = ReturnType<typeof createBoard>;
