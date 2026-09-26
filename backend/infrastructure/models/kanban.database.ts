/**
 * Modelos kanban class-based con tipado completo de atributos.
 */
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from 'sequelize';
import type { Recurrence } from '../../domain/types';
import { sequelize, UserModel } from './database';

export class BoardModel extends Model<InferAttributes<BoardModel>, InferCreationAttributes<BoardModel>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare description: string | null;
  declare color: string;
  declare ownerId: string;

  // Asociaciones (no columnas)
  declare owner?: NonAttribute<UserModel>;
  declare members?: NonAttribute<BoardMemberModel[]>;
  declare columns?: NonAttribute<ColumnModel[]>;
  declare tasks?: NonAttribute<TaskModel[]>;
}

BoardModel.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  color: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '#6366f1' },
  ownerId: { type: DataTypes.STRING, allowNull: false }
}, { sequelize, tableName: 'kanban_boards' });

export class BoardMemberModel extends Model<InferAttributes<BoardMemberModel>, InferCreationAttributes<BoardMemberModel>> {
  declare id: CreationOptional<string>;
  declare boardId: string;
  declare userId: string;
  declare role: string;

  declare user?: NonAttribute<UserModel>;
  declare board?: NonAttribute<BoardModel>;
}

BoardMemberModel.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  boardId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'member' }
}, {
  sequelize,
  tableName: 'kanban_board_members',
  indexes: [{ unique: true, fields: ['boardId', 'userId'] }]
});

export class ColumnModel extends Model<InferAttributes<ColumnModel>, InferCreationAttributes<ColumnModel>> {
  declare id: CreationOptional<string>;
  declare boardId: string;
  declare name: string;
  declare color: string;
  declare position: number;
  declare isDone: boolean;
  declare isPaused: boolean;
  declare wipLimit: number | null;

  declare board?: NonAttribute<BoardModel>;
  declare tasks?: NonAttribute<TaskModel[]>;
}

ColumnModel.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  boardId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING(80), allowNull: false },
  color: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '#64748b' },
  position: { type: DataTypes.INTEGER, allowNull: false },
  isDone: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  isPaused: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  wipLimit: { type: DataTypes.INTEGER, allowNull: true }
}, {
  sequelize,
  tableName: 'kanban_columns',
  indexes: [{ unique: false, fields: ['boardId', 'position'] }]
});

export class TaskModel extends Model<InferAttributes<TaskModel>, InferCreationAttributes<TaskModel>> {
  declare id: CreationOptional<string>;
  declare boardId: string;
  declare columnId: string;
  declare title: string;
  declare description: string | null;
  declare assigneeId: string | null;
  declare priority: 'low' | 'medium' | 'high';
  declare effortPoints: number | null;
  declare estimatedMinutes: number | null;
  declare dueDate: string | null;
  declare dueTime: string | null;
  declare tags: CreationOptional<string[]>;
  declare recurrence: Recurrence;
  declare completedAt: CreationOptional<Date | null>;
  declare archivedAt: string | null;

  declare assignee?: NonAttribute<UserModel | null>;
  declare occurrences?: NonAttribute<TaskOccurrenceModel[]>;
}

TaskModel.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  boardId: { type: DataTypes.UUID, allowNull: false },
  columnId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING(180), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  assigneeId: { type: DataTypes.STRING, allowNull: true },
  priority: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'medium' },
  effortPoints: { type: DataTypes.INTEGER, allowNull: true },
  estimatedMinutes: { type: DataTypes.INTEGER, allowNull: true },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true },
  dueTime: { type: DataTypes.TIME, allowNull: true },
  tags: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  recurrence: { type: DataTypes.JSONB, allowNull: false, defaultValue: { type: 'none', days: [] } },
  completedAt: { type: DataTypes.DATE, allowNull: true },
  archivedAt: { type: DataTypes.DATEONLY, allowNull: true }
}, { sequelize, tableName: 'kanban_tasks' });

export class TaskOccurrenceModel extends Model<InferAttributes<TaskOccurrenceModel>, InferCreationAttributes<TaskOccurrenceModel>> {
  declare id: CreationOptional<string>;
  declare taskId: string;
  declare date: string;
  declare status: string;
  declare columnId: string;
  declare completedAt: Date | null;

  declare task?: NonAttribute<TaskModel>;
  declare column?: NonAttribute<ColumnModel>;
}

TaskOccurrenceModel.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  taskId: { type: DataTypes.UUID, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'todo' },
  columnId: { type: DataTypes.UUID, allowNull: false },
  completedAt: { type: DataTypes.DATE, allowNull: true }
}, {
  sequelize,
  tableName: 'kanban_task_occurrences',
  indexes: [{ unique: true, fields: ['taskId', 'date'] }]
});

// --- Asociaciones ---
BoardModel.belongsTo(UserModel, { foreignKey: 'ownerId', as: 'owner' });
BoardModel.hasMany(BoardMemberModel, { foreignKey: 'boardId', as: 'members', onDelete: 'CASCADE' });
BoardModel.hasMany(ColumnModel, { foreignKey: 'boardId', as: 'columns', onDelete: 'CASCADE' });
BoardModel.hasMany(TaskModel, { foreignKey: 'boardId', as: 'tasks', onDelete: 'CASCADE' });
BoardMemberModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });
BoardMemberModel.belongsTo(BoardModel, { foreignKey: 'boardId', as: 'board' });
ColumnModel.belongsTo(BoardModel, { foreignKey: 'boardId', as: 'board' });
ColumnModel.hasMany(TaskModel, { foreignKey: 'columnId', as: 'tasks' });
TaskModel.belongsTo(BoardModel, { foreignKey: 'boardId', as: 'board' });
TaskModel.belongsTo(ColumnModel, { foreignKey: 'columnId', as: 'column' });
TaskModel.belongsTo(UserModel, { foreignKey: 'assigneeId', as: 'assignee' });
TaskModel.hasMany(TaskOccurrenceModel, { foreignKey: 'taskId', as: 'occurrences', onDelete: 'CASCADE' });
TaskOccurrenceModel.belongsTo(TaskModel, { foreignKey: 'taskId', as: 'task' });
TaskOccurrenceModel.belongsTo(ColumnModel, { foreignKey: 'columnId', as: 'column' });
