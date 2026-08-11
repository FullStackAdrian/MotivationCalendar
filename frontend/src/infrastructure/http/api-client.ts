import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { TokenStorage } from '../auth/token-storage';

export class ApiError extends Error { constructor(message: string, public readonly status?: number) { super(message); this.name = 'ApiError'; } }

export class ApiClient {
  private readonly http: AxiosInstance;
  private token: string | null = null;
  constructor(baseURL: string, private readonly storage: TokenStorage = new TokenStorage()) {
    this.http = axios.create({ baseURL: baseURL.replace(/\/$/, ''), timeout: 10_000, headers: { 'Content-Type': 'application/json' } });
    this.http.interceptors.request.use((config) => { if (this.token) config.headers.Authorization = `Bearer ${this.token}`; return config; });
    this.http.interceptors.response.use((response) => response, (error) => Promise.reject(new ApiError(error.response?.data?.error ?? error.message ?? 'Error de red', error.response?.status)));
  }
  async hydrate(): Promise<void> { this.token = await this.storage.get(); }
  async setToken(token: string | null): Promise<void> { this.token = token; if (token) await this.storage.set(token); else await this.storage.clear(); }
  getToken(): string | null { return this.token; }
  hasToken(): boolean { return Boolean(this.token); }
  async get<T>(url: string, config?: AxiosRequestConfig) { return (await this.http.get<T>(url, config)).data; }
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) { return (await this.http.post<T>(url, data, config)).data; }
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) { return (await this.http.put<T>(url, data, config)).data; }
  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig) { return (await this.http.patch<T>(url, data, config)).data; }
  async delete<T>(url: string, config?: AxiosRequestConfig) { return (await this.http.delete<T>(url, config)).data; }
}
export const apiClient = new ApiClient(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000');
