/**
 * Adaptador Sequelize del puerto TaskRepository (incluye ocurrencias).
 */
import { Op, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import type { TaskRepository } from '../../domain/repositories/task.repository';
import type { OccurrencePatch, Task, TaskOccurrence, TaskPatch } from '../../domain/types';
import { TaskModel, TaskOccurrenceModel } from '../models/kanban.database';

export class SequelizeTaskRepository implements TaskRepository {
  async findById(taskId: string): Promise<Task | null> {
    const task = await TaskModel.findByPk(taskId);
    return task ? (task.toJSON() as unknown as Task) : null;
  }

  async listActiveByBoard(boardId: string): Promise<Task[]> {
    const tasks = await TaskModel.findAll({ where: { boardId, archivedAt: null } });
    return tasks.map((task) => task.toJSON() as unknown as Task);
  }

  async listArchived(boardId: string, filters: { assigneeId?: string } = {}): Promise<Task[]> {
    const where: Record<string, unknown> = { boardId, archivedAt: { [Op.ne]: null } };
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    const tasks = await TaskModel.findAll({ where, order: [['archivedAt', 'DESC']] });
    return tasks.map((task) => task.toJSON() as unknown as Task);
  }

  async countActiveInColumn(boardId: string, columnId: string): Promise<number> {
    return TaskModel.count({ where: { boardId, columnId, archivedAt: null } });
  }

  async create(data: Omit<Task, 'id'>): Promise<Task> {
    const task = await TaskModel.create(data as unknown as InferCreationAttributes<TaskModel>);
    return task.toJSON() as unknown as Task;
  }

  async update(taskId: string, patch: TaskPatch): Promise<Task | null> {
    const task = await TaskModel.findByPk(taskId);
    if (!task) return null;
    await task.update(patch as unknown as Partial<InferAttributes<TaskModel>>);
    return task.toJSON() as unknown as Task;
  }

  // --- Ocurrencias ---

  async findOccurrenceByTaskAndDate(taskId: string, date: string): Promise<TaskOccurrence | null> {
    const occurrence = await TaskOccurrenceModel.findOne({ where: { taskId, date } });
    return occurrence ? (occurrence.toJSON() as unknown as TaskOccurrence) : null;
  }

  async findFirstTodoOccurrence(taskId: string): Promise<TaskOccurrence | null> {
    const occurrence = await TaskOccurrenceModel.findOne({
      where: { taskId, status: 'todo' },
      order: [['date', 'ASC']]
    });
    return occurrence ? (occurrence.toJSON() as unknown as TaskOccurrence) : null;
  }

  async createOccurrence(data: { taskId: string; date: string; status: string; columnId: string }): Promise<TaskOccurrence> {
    const occurrence = await TaskOccurrenceModel.create(data);
    return occurrence.toJSON() as unknown as TaskOccurrence;
  }

  async findOrCreateNextOccurrence(taskId: string, date: string, defaults: { status: string; columnId: string }): Promise<TaskOccurrence> {
    const [occurrence] = await TaskOccurrenceModel.findOrCreate({
      where: { taskId, date },
      defaults: { taskId, date, ...defaults }
    });
    return occurrence.toJSON() as unknown as TaskOccurrence;
  }

  async updateOccurrence(occurrenceId: string, patch: OccurrencePatch): Promise<TaskOccurrence | null> {
    const occurrence = await TaskOccurrenceModel.findByPk(occurrenceId);
    if (!occurrence) return null;
    await occurrence.update(patch as unknown as Partial<InferAttributes<TaskOccurrenceModel>>);
    return occurrence.toJSON() as unknown as TaskOccurrence;
  }
}
