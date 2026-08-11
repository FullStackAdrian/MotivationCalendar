class KanbanPresenter {
  constructor(view, service, authService) {
    this.view = view;
    this.service = service;
    this.authService = authService;
    this.user = null;
    this.boards = [];
    this.board = null;
    this.onBackCallback = null;
  }

  async show(user) {
    this.user = user;
    this.boards = await this.service.listBoards();
    if (!this.boards.length) {
      this.board = await this.service.createBoard({ name: 'Mi primera pizarra' });
      this.boards = [this.board];
    }
    this.board = await this.service.getBoard(this.board?.id || this.boards[0].id);
    this.view.show(user, this.boards, this.board);
    this.bindNavigation();
    this.render();
  }

  hide() { this.view.closeModal(); }

  bindNavigation() {
    this.view.onBack(() => this.onBackCallback?.());
    this.view.onBoardChange(async boardId => { this.board = await this.service.getBoard(boardId); this.render(); });
    this.view.onNewBoard(() => {
      this.view.showBoardForm(); this.view.onModalClose();
      this.view.onModalSubmit('#board-form', async data => {
        try { this.board = await this.service.createBoard({ name: data.get('name'), description: data.get('description') || null }); this.boards = await this.service.listBoards(); this.view.closeModal(); this.view.show(this.user, this.boards, this.board); this.bindNavigation(); this.render(); }
        catch (error) { alert(error.message); }
      });
    });
    this.view.onNewTask(() => {
      this.view.showTaskForm(this.board.columns || [], []); this.view.onModalClose();
      this.view.onModalSubmit('#task-form', async data => {
        const type = data.get('recurrenceType');
        const days = [...document.querySelectorAll('#weekday-picker input:checked')].map(input => Number(input.value));
        try {
          await this.service.createTask(this.board.id, {
            title: data.get('title'), columnId: data.get('columnId'), assigneeId: data.get('assigneeId') || null,
            priority: data.get('priority'), effortPoints: data.get('effortPoints') ? Number(data.get('effortPoints')) : null,
            estimatedMinutes: data.get('estimatedMinutes') ? Number(data.get('estimatedMinutes')) : null,
            dueDate: data.get('dueDate') || null, dueTime: data.get('dueTime') || null,
            tags: String(data.get('tags') || '').split(',').map(tag => tag.trim()).filter(Boolean),
            recurrence: type === 'weekly' ? { type, days } : { type: 'none', days: [] }
          });
          this.view.closeModal(); await this.reload();
        } catch (error) { alert(error.message); }
      });
    });
    this.view.onArchive(async () => { const tasks = await this.service.archive(this.board.id); this.view.showArchive(tasks); this.view.onModalClose(); });
  }

  render() {
    this.view.renderBoard(this.board, async (taskId, columnId) => {
      try { await this.service.moveTask(taskId, columnId); await this.reload(); } catch (error) { alert(error.message); }
    }, () => {});
  }

  async reload() {
    this.board = await this.service.getBoard(this.board.id);
    this.render();
  }

  setOnBack(callback) { this.onBackCallback = callback; }
}

window.KanbanPresenter = KanbanPresenter;
