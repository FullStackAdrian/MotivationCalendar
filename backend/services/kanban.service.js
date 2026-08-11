const { Op } = require('sequelize');
const { Board, BoardMember, BoardColumn, Task, TaskOccurrence } = require('../models/kanban.database');
const { User } = require('../models/database');
const { createBoard, createColumn, createTask, moveColumn, validateRecurrence, getNextOccurrenceDate } = require('../domain/kanban');

class KanbanService {
  async isMember(boardId, userId) {
    const board = await Board.findOne({ where: { id: boardId, ownerId: userId } });
    if (board) return true;
    return Boolean(await BoardMember.findOne({ where: { boardId, userId } }));
  }

  async createBoard(userId, data) {
    const value = createBoard({ ...data, ownerId: userId });
    delete value.id;
    delete value.columns;
    const board = await Board.create(value);
    await BoardMember.create({ boardId: board.id, userId, role: 'owner' });
    const defaults = [
      { name: 'Todo', color: '#3b82f6' },
      { name: 'En progreso', color: '#f59e0b' },
      { name: 'Pausa', color: '#64748b', isPaused: true },
      { name: 'Done', color: '#22c55e', isDone: true }
    ];
    await Promise.all(defaults.map((column, position) => BoardColumn.create({ boardId: board.id, ...column, position })));
    return this.getBoard(board.id, userId);
  }

  async listBoards(userId) {
    const owned = await Board.findAll({ where: { ownerId: userId }, order: [['createdAt', 'ASC']] });
    const memberships = await BoardMember.findAll({ where: { userId }, attributes: ['boardId'] });
    const memberIds = memberships.map(item => item.boardId);
    const joined = memberIds.length ? await Board.findAll({ where: { id: { [Op.in]: memberIds } } }) : [];
    const map = new Map([...owned, ...joined].map(board => [board.id, board]));
    return [...map.values()];
  }

  async getBoard(boardId, userId, today = new Date().toISOString().slice(0, 10)) {
    if (!(await this.isMember(boardId, userId))) throw new Error('No autorizado');
    await this.synchronizeBoard(boardId, today);
    return Board.findByPk(boardId, {
      include: [
        { model: BoardColumn, as: 'columns' },
        { model: Task, as: 'tasks', where: { archivedAt: null }, required: false, include: [
          { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] },
          { model: TaskOccurrence, as: 'occurrences' }
        ] }
      ]
    });
  }

  async addMember(boardId, ownerId, userId) {
    const board = await Board.findOne({ where: { id: boardId, ownerId } });
    if (!board) throw new Error('No autorizado');
    const user = await User.findByPk(userId);
    if (!user) throw new Error('Usuario no encontrado');
    const [member] = await BoardMember.findOrCreate({ where: { boardId, userId }, defaults: { role: 'member' } });
    return member;
  }

  async createColumn(boardId, userId, data) {
    if (!(await this.isMember(boardId, userId))) throw new Error('No autorizado');
    const count = await BoardColumn.count({ where: { boardId } });
    const value = createColumn({ ...data, boardId, position: data.position ?? count });
    delete value.id;
    return BoardColumn.create(value);
  }

  async reorderColumn(boardId, userId, columnId, targetPosition) {
    if (!(await this.isMember(boardId, userId))) throw new Error('No autorizado');
    const columns = await BoardColumn.findAll({ where: { boardId }, order: [['position', 'ASC']] });
    const reordered = moveColumn(columns.map(item => item.toJSON()), columnId, targetPosition);
    await BoardColumn.sequelize.transaction(async transaction => {
      for (const column of reordered) await BoardColumn.update({ position: column.position }, { where: { id: column.id }, transaction });
    });
    return reordered;
  }

  async updateColumn(columnId, userId, data) {
    const column = await BoardColumn.findByPk(columnId);
    if (!column || !(await this.isMember(column.boardId, userId))) throw new Error('No autorizado');
    const allowed = ['name', 'color', 'isDone', 'isPaused', 'wipLimit'];
    for (const key of allowed) if (data[key] !== undefined) column[key] = data[key];
    await column.save();
    return column;
  }

  async createTask(boardId, userId, data) {
    if (!(await this.isMember(boardId, userId))) throw new Error('No autorizado');
    const column = await BoardColumn.findOne({ where: { id: data.columnId, boardId } });
    if (!column) throw new Error('Estado no encontrado');
    const recurrence = validateRecurrence(data.recurrence);
    const value = createTask({ ...data, boardId, recurrence });
    delete value.id;
    const task = await Task.create(value);
    const firstDate = data.dueDate || this.nextScheduledDate(recurrence, new Date().toISOString().slice(0, 10));
    if (firstDate) await TaskOccurrence.create({ taskId: task.id, date: firstDate, status: 'todo', columnId: column.id });
    return task;
  }

  nextScheduledDate(recurrence, today) {
    if (recurrence.type !== 'weekly') return null;
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay() || 7;
    if (recurrence.days.includes(weekday)) return today;
    return getNextOccurrenceDate(today, recurrence.days);
  }

  async moveTask(taskId, userId, columnId) {
    const task = await Task.findByPk(taskId);
    if (!task || !(await this.isMember(task.boardId, userId))) throw new Error('No autorizado');
    const column = await BoardColumn.findOne({ where: { id: columnId, boardId: task.boardId } });
    if (!column) throw new Error('Estado no encontrado');
    if (column.wipLimit !== null) {
      const count = await Task.count({ where: { boardId: task.boardId, columnId, archivedAt: null } });
      if (task.columnId !== columnId && count >= column.wipLimit) throw new Error('Límite WIP alcanzado');
    }
    task.columnId = columnId;
    if (column.isDone) task.completedAt = new Date();
    else task.completedAt = null;
    await task.save();
    return task;
  }

  async completeTask(taskId, userId, today = new Date().toISOString().slice(0, 10)) {
    const task = await Task.findByPk(taskId);
    if (!task || !(await this.isMember(task.boardId, userId))) throw new Error('No autorizado');
    const doneColumn = await BoardColumn.findOne({ where: { boardId: task.boardId, isDone: true }, order: [['position', 'DESC']] });
    if (!doneColumn) throw new Error('La pizarra no tiene estado Done');
    const previousColumnId = task.columnId;
    task.columnId = doneColumn.id;
    task.completedAt = new Date();
    await task.save();
    if (task.recurrence.type === 'weekly') {
      const nextDate = getNextOccurrenceDate(today, task.recurrence.days);
      await TaskOccurrence.findOrCreate({ where: { taskId: task.id, date: nextDate }, defaults: { status: 'todo', columnId: previousColumnId } });
    }
    return task;
  }

  async synchronizeBoard(boardId, today) {
    const tasks = await Task.findAll({ where: { boardId, archivedAt: null } });
    for (const task of tasks) {
      if (task.recurrence.type === 'weekly') {
        const nextDate = this.nextScheduledDate(task.recurrence, today);
        if (nextDate) {
          const existing = await TaskOccurrence.findOne({ where: { taskId: task.id, date: nextDate } });
          if (!existing) {
            const firstTodo = await TaskOccurrence.findOne({ where: { taskId: task.id, status: 'todo' }, order: [['date', 'ASC']] });
            await TaskOccurrence.create({ taskId: task.id, date: nextDate, status: 'todo', columnId: firstTodo?.columnId || task.columnId });
          }
        }
        continue;
      }
      if (task.completedAt && task.completedAt.toISOString().slice(0, 10) < today) {
        task.archivedAt = today;
        await task.save();
      }
    }
  }

  async listArchive(boardId, userId, filters = {}) {
    if (!(await this.isMember(boardId, userId))) throw new Error('No autorizado');
    const where = { boardId, archivedAt: { [Op.ne]: null } };
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    return Task.findAll({ where, order: [['archivedAt', 'DESC']] });
  }
}

module.exports = KanbanService;
