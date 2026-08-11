const { DataTypes } = require('sequelize');
const { sequelize, User } = require('./database');

const Board = sequelize.define('Board', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  color: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '#6366f1' },
  ownerId: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'kanban_boards' });

const BoardMember = sequelize.define('BoardMember', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  boardId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'member' }
}, { tableName: 'kanban_board_members', indexes: [{ unique: true, fields: ['boardId', 'userId'] }] });

const BoardColumn = sequelize.define('BoardColumn', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  boardId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING(80), allowNull: false },
  color: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '#64748b' },
  position: { type: DataTypes.INTEGER, allowNull: false },
  isDone: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  isPaused: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  wipLimit: { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'kanban_columns', indexes: [{ unique: true, fields: ['boardId', 'position'] }] });

const Task = sequelize.define('KanbanTask', {
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
}, { tableName: 'kanban_tasks' });

const TaskOccurrence = sequelize.define('TaskOccurrence', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  taskId: { type: DataTypes.UUID, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'todo' },
  columnId: { type: DataTypes.UUID, allowNull: false },
  completedAt: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'kanban_task_occurrences', indexes: [{ unique: true, fields: ['taskId', 'date'] }] });

Board.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Board.hasMany(BoardMember, { foreignKey: 'boardId', as: 'members', onDelete: 'CASCADE' });
Board.hasMany(BoardColumn, { foreignKey: 'boardId', as: 'columns', onDelete: 'CASCADE' });
Board.hasMany(Task, { foreignKey: 'boardId', as: 'tasks', onDelete: 'CASCADE' });
BoardMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
BoardMember.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });
BoardColumn.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });
BoardColumn.hasMany(Task, { foreignKey: 'columnId', as: 'tasks' });
Task.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });
Task.belongsTo(BoardColumn, { foreignKey: 'columnId', as: 'column' });
Task.belongsTo(User, { foreignKey: 'assigneeId', as: 'assignee' });
Task.hasMany(TaskOccurrence, { foreignKey: 'taskId', as: 'occurrences', onDelete: 'CASCADE' });
TaskOccurrence.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
TaskOccurrence.belongsTo(BoardColumn, { foreignKey: 'columnId', as: 'column' });

module.exports = { Board, BoardMember, BoardColumn, Task, TaskOccurrence };
