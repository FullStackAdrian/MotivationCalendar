/**
 * Adaptador Sequelize del puerto BoardRepository (incluye membresías).
 */
import { Op } from 'sequelize';
import type { BoardRepository, DefaultColumnSpec } from '../../domain/repositories/board.repository';
import type { Board, BoardMemberRow, BoardWithDetails, MemberUser } from '../../domain/types';
import { UserModel } from '../models/database';
import { BoardMemberModel, BoardModel, ColumnModel, TaskModel, TaskOccurrenceModel } from '../models/kanban.database';

export class SequelizeBoardRepository implements BoardRepository {
  async findByIdWithDetails(boardId: string): Promise<BoardWithDetails | null> {
    const board = await BoardModel.findByPk(boardId, {
      include: [
        { model: ColumnModel, as: 'columns' },
        {
          model: TaskModel,
          as: 'tasks',
          where: { archivedAt: null },
          required: false,
          include: [
            { model: UserModel, as: 'assignee', attributes: ['id', 'username', 'email'] },
            { model: TaskOccurrenceModel, as: 'occurrences' }
          ]
        }
      ]
    });
    return board ? (board.toJSON() as unknown as BoardWithDetails) : null;
  }

  async listVisibleByUser(userId: string): Promise<Board[]> {
    const owned = await BoardModel.findAll({ where: { ownerId: userId }, order: [['createdAt', 'ASC']] });
    const memberships = await BoardMemberModel.findAll({ where: { userId }, attributes: ['boardId'] });
    const memberIds = memberships.map((item) => item.boardId);
    const joined = memberIds.length ? await BoardModel.findAll({ where: { id: { [Op.in]: memberIds } } }) : [];
    const map = new Map([...owned, ...joined].map((board) => [board.id, board]));
    return [...map.values()].map((board) => board.toJSON() as unknown as Board);
  }

  async createWithDefaults(boardData: Pick<Board, 'name' | 'description' | 'color' | 'ownerId'>, ownerId: string, defaultColumns: DefaultColumnSpec[]): Promise<Board> {
    return BoardModel.sequelize!.transaction(async (transaction) => {
      const board = await BoardModel.create({ ...boardData }, { transaction });
      await BoardMemberModel.create({ boardId: board.id, userId: ownerId, role: 'owner' }, { transaction });
      await Promise.all(defaultColumns.map((column, position) =>
        ColumnModel.create({
          boardId: board.id,
          name: column.name,
          color: column.color,
          isDone: column.isDone ?? false,
          isPaused: column.isPaused ?? false,
          position
        }, { transaction })
      ));
      return board.toJSON() as unknown as Board;
    });
  }

  async isOwner(boardId: string, ownerId: string): Promise<boolean> {
    const board = await BoardModel.findOne({ where: { id: boardId, ownerId } });
    return Boolean(board);
  }

  async hasAccess(boardId: string, userId: string): Promise<boolean> {
    if (!(await this.isOwner(boardId, userId))) {
      return Boolean(await this.isMemberRow(boardId, userId));
    }
    return true;
  }

  async isMemberRow(boardId: string, userId: string): Promise<boolean> {
    const member = await BoardMemberModel.findOne({ where: { boardId, userId } });
    return Boolean(member);
  }

  async addMemberIfAbsent(boardId: string, userId: string, role: string): Promise<{ created: boolean; member: BoardMemberRow | null }> {
    const [member, created] = await BoardMemberModel.findOrCreate({
      where: { boardId, userId },
      defaults: { boardId, userId, role }
    });
    return { created, member: member.toJSON() as unknown as BoardMemberRow };
  }

  async listMemberUsers(boardId: string): Promise<MemberUser[]> {
    const members = await BoardMemberModel.findAll({
      where: { boardId },
      include: [{ model: UserModel, as: 'user', attributes: ['id', 'username', 'email'] }]
    });
    return members.map((member) => member.user!.toJSON() as unknown as MemberUser);
  }
}
