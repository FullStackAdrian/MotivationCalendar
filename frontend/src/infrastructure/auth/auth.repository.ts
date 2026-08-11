import { apiClient } from '@/infrastructure/http/api-client';

export interface User { id: number | string; username: string; email: string; createdAt?: string | null; }
export interface AuthResponse { token: string; user: User; message?: string; }

export class AuthRepository {
  async login(identifier: string, password: string): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/login', { identifier, password });
  }

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/register', { username, email, password });
  }
}
