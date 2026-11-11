import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { TokenStorage } from '../auth/token-storage';

export class ApiError extends Error { constructor(message: string, public readonly status?: number) { super(message); this.name = 'ApiError'; } }

/** URL base: configurable vía EXPO_PUBLIC_API_URL; en emulador Android `localhost` no existe. */
export function defaultBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');
}

export class ApiClient {
  private readonly http: AxiosInstance;
  private token: string | null = null;
  /** BETA-3: aviso de 401 (p. ej. AuthProvider limpia el usuario y marca expiración). */
  onUnauthorized: (() => void) | null = null;
  constructor(baseURL: string = defaultBaseUrl(), private readonly storage: TokenStorage = new TokenStorage()) {
    this.http = axios.create({ baseURL: baseURL.replace(/\/$/, ''), timeout: 10_000, headers: { 'Content-Type': 'application/json' } });
    this.http.interceptors.request.use((config) => { if (this.token) config.headers.Authorization = `Bearer ${this.token}`; return config; });
    this.http.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error?.response?.status === 401) {
          await this.clearAuth();
          this.onUnauthorized?.();
        }
        return Promise.reject(new ApiError(error.response?.data?.error ?? error.message ?? 'Error de red', error.response?.status));
      }
    );
  }
  async clearAuth(): Promise<void> { this.token = null; await this.storage.clear(); }
  async hydrate(): Promise<void> { this.token = await this.storage.get(); }
  async setToken(token: string | null): Promise<void> { this.token = token; if (token) await this.storage.set(token); else await this.storage.clear(); }
  getToken(): string | null { return this.token; }
  hasToken(): boolean { return Boolean(this.token); }
  async get<T>(url: string, config?: AxiosRequestConfig) {
    // BETA-3: un solo reintento en GETs idempotentes ante fallo de red.
    // No se reintentan respuestas HTTP (401/500): solo errores sin respuesta.
    try {
      return (await this.http.get<T>(url, config)).data;
    } catch (error) {
      const isNetwork = error instanceof ApiError
        ? error.status === undefined
        : (error as { response?: unknown })?.response === undefined;
      if (!isNetwork) throw error;
      return (await this.http.get<T>(url, config)).data;
    }
  }
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) { return (await this.http.post<T>(url, data, config)).data; }
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) { return (await this.http.put<T>(url, data, config)).data; }
  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig) { return (await this.http.patch<T>(url, data, config)).data; }
  async delete<T>(url: string, config?: AxiosRequestConfig) { return (await this.http.delete<T>(url, config)).data; }
}
export const apiClient = new ApiClient(defaultBaseUrl());
