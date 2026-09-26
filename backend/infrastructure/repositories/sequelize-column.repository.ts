/**
 * Adaptador Sequelize del puerto ColumnRepository.
 */
import type { ColumnRepository } from '../../domain/repositories/column.repository';
import type { Column, ColumnPatch } from '../../domain/types';
import { ColumnModel } from '../models/kanban.database';

export class SequelizeColumnRepository implements ColumnRepository {
  async findById(columnId: string): Promise<Column | null> {
    const column = await ColumnModel.findByPk(columnId);
    return column ? (column.toJSON() as unknown as Column) : null;
  }

  async findByIdInBoard(columnId: string, boardId: string): Promise<Column | null> {
    const column = await ColumnModel.findOne({ where: { id: columnId, boardId } });
    return column ? (column.toJSON() as unknown as Column) : null;
  }

  async listByBoardOrdered(boardId: string): Promise<Column[]> {
    const columns = await ColumnModel.findAll({ where: { boardId }, order: [['position', 'ASC']] });
    return columns.map((column) => column.toJSON() as unknown as Column);
  }

  async countByBoard(boardId: string): Promise<number> {
    return ColumnModel.count({ where: { boardId } });
  }

  async findDoneByBoard(boardId: string): Promise<Column | null> {
    const column = await ColumnModel.findOne({ where: { boardId, isDone: true }, order: [['position', 'DESC']] });
    return column ? (column.toJSON() as unknown as Column) : null;
  }

  async create(data: Omit<Column, 'id'>): Promise<Column> {
    const column = await ColumnModel.create(data);
    return column.toJSON() as unknown as Column;
  }

  async update(columnId: string, patch: ColumnPatch): Promise<Column | null> {
    const column = await ColumnModel.findByPk(columnId);
    if (!column) return null;
    await column.update(patch);
    return column.toJSON() as unknown as Column;
  }

  async updatePositions(positions: Array<{ id: string; position: number }>): Promise<void> {
    await ColumnModel.sequelize!.transaction(async (transaction) => {
      for (const { id, position } of positions) {
        await ColumnModel.update({ position }, { where: { id }, transaction });
      }
    });
  }
}
