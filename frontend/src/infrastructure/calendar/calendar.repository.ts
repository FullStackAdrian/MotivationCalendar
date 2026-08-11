import { apiClient } from '@/infrastructure/http/api-client';

export interface ProgressResponse { progress: Record<string, 'completed' | 'partial' | 'failed'>; }

export class CalendarRepository {
  async getProgress(): Promise<ProgressResponse> { return apiClient.get<ProgressResponse>('/api/progress'); }
  async updateDay(dayKey: string, status: 'completed' | 'partial' | 'failed'): Promise<ProgressResponse> {
    return apiClient.put<ProgressResponse>(`/api/progress/${dayKey}`, { status });
  }
}
