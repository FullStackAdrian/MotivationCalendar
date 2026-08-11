import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthRepository, User } from '@/infrastructure/auth/auth.repository';
import { apiClient } from '@/infrastructure/http/api-client';

interface AuthContextValue { user: User | null; loading: boolean; login(identifier: string, password: string): Promise<void>; register(username: string, email: string, password: string): Promise<void>; logout(): Promise<void>; }
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const repository = new AuthRepository();

function userFromToken(token: string | null): User | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = typeof globalThis.atob === 'function' ? globalThis.atob(normalized) : '';
    const value = JSON.parse(decodeURIComponent(decoded.split('').map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`).join('')));
    if (!value?.id && !value?.userId) return null;
    return { id: value.id ?? value.userId, username: value.username ?? '', email: value.email ?? '' };
  } catch { return null; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { apiClient.hydrate().then(() => setUser(userFromToken(apiClient.getToken()))).finally(() => setLoading(false)); }, []);
  const value = useMemo<AuthContextValue>(() => ({
    user, loading,
    async login(identifier, password) { const result = await repository.login(identifier, password); await apiClient.setToken(result.token); setUser(result.user); },
    async register(username, email, password) { const result = await repository.register(username, email, password); await apiClient.setToken(result.token); setUser(result.user); },
    async logout() { await apiClient.setToken(null); setUser(null); },
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within AuthProvider'); return context; }
