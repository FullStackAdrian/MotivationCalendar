class KanbanService {
  constructor(apiClient) { this.apiClient = apiClient; }
  listBoards() { return this.apiClient.request('/api/kanban/boards'); }
  getBoard(boardId) { return this.apiClient.request(`/api/kanban/boards/${boardId}`); }
  getMembers(boardId) { return this.apiClient.request(`/api/kanban/boards/${boardId}/members`); }
  createBoard(data) { return this.apiClient.request('/api/kanban/boards', { method: 'POST', body: JSON.stringify(data) }); }
  createColumn(boardId, data) { return this.apiClient.request(`/api/kanban/boards/${boardId}/columns`, { method: 'POST', body: JSON.stringify(data) }); }
  updateColumn(columnId, data) { return this.apiClient.request(`/api/kanban/columns/${columnId}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  reorderColumn(boardId, columnId, position) { return this.apiClient.request(`/api/kanban/boards/${boardId}/columns/${columnId}/position`, { method: 'PATCH', body: JSON.stringify({ position }) }); }
  createTask(boardId, data) { return this.apiClient.request(`/api/kanban/boards/${boardId}/tasks`, { method: 'POST', body: JSON.stringify(data) }); }
  moveTask(taskId, columnId) { return this.apiClient.request(`/api/kanban/tasks/${taskId}/move`, { method: 'PATCH', body: JSON.stringify({ columnId }) }); }
  completeTask(taskId, date) { return this.apiClient.request(`/api/kanban/tasks/${taskId}/complete`, { method: 'POST', body: JSON.stringify({ date }) }); }
  archive(boardId, filters = {}) { const params = new URLSearchParams(filters).toString(); return this.apiClient.request(`/api/kanban/boards/${boardId}/archive${params ? `?${params}` : ''}`); }
}
window.KanbanService = KanbanService;
