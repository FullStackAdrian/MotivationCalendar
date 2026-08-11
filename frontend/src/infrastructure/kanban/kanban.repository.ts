import { apiClient } from '@/infrastructure/http/api-client';

export interface BoardColumn { id: string; name: string; color: string; position: number; isDone: boolean; isPaused: boolean; wipLimit?: number | null; }
export interface Task { id: string; title: string; columnId: string; priority: 'low' | 'medium' | 'high'; effortPoints?: number; estimatedMinutes?: number; dueDate?: string | null; dueTime?: string | null; tags?: string[]; archivedAt?: string | null; assignee?: { id: string; username: string } | null; recurrence?: { type: 'weekly'; days: number[] } | null; }
export interface Board { id: string; name: string; description?: string; columns: BoardColumn[]; tasks: Task[]; }
export interface BoardMember { id: string; username: string; email: string; }

export class KanbanRepository {
  listBoards() { return apiClient.get<{ boards: Board[] }>('/api/kanban/boards'); }
  getBoard(id: string) { return apiClient.get<Board>(`/api/kanban/boards/${id}`); }
  getMembers(id: string) { return apiClient.get<{ members: BoardMember[] }>(`/api/kanban/boards/${id}/members`); }
  createBoard(data: { name: string; description?: string }) { return apiClient.post<Board>('/api/kanban/boards', data); }
  createColumn(boardId: string, data: Partial<BoardColumn>) { return apiClient.post<BoardColumn>(`/api/kanban/boards/${boardId}/columns`, data); }
  createTask(boardId: string, data: Record<string, unknown>) { return apiClient.post<Task>(`/api/kanban/boards/${boardId}/tasks`, data); }
  moveTask(taskId: string, columnId: string, date?: string) { return apiClient.patch<Task>(`/api/kanban/tasks/${taskId}/move`, { columnId, ...(date ? { date } : {}) }); }
  archive(boardId: string) { return apiClient.get<{ tasks: Task[] }>(`/api/kanban/boards/${boardId}/archive`); }
}
