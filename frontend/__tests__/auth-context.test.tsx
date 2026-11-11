import React from 'react';
import { Platform } from 'react-native';
import './helpers/polyfill-storage';
import { clearWebStorage } from './helpers/polyfill-storage';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@/infrastructure/http/api-client';
import { AuthProvider, useAuth } from '@/contexts/auth-context';

jest.mock('axios', () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  return { create: jest.fn(() => instance), __instance: instance };
});
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import axios from 'axios';

const secure = jest.mocked(SecureStore);

const httpInstance = (): { post: jest.Mock } => (axios as unknown as { __instance: { post: jest.Mock } }).__instance;

const VALID_TOKEN = 'eyJhbGciOiJub25lIn0.eyJpZCI6InUxIiwidXNlcm5hbWUiOiJhbGljZSIsImVtYWlsIjoiYUBiLmNvbSIsImV4cCI6MjAwMDAwMDAwMH0.x';
const EXPIRED_TOKEN = 'eyJhbGciOiJub25lIn0.eyJpZCI6InUxIiwidXNlcm5hbWUiOiJhbGljZSIsImV4cCI6MTAwMDAwMDAwMH0.x';
const ANONYMOUS_TOKEN = 'eyJhbGciOiJub25lIn0.eyJ1c2VybmFtZSI6Im5vaWQifQ.x';
const future = () => 2000000000;

function Probe({ onValue }: { onValue: (value: ReturnType<typeof useAuth>) => void }) {
  const value = useAuth();
  onValue(value);
  return <Text>probe</Text>;
}

async function latestValue(): Promise<{ ref: { current?: ReturnType<typeof useAuth> } }> {
  const ref: { current?: ReturnType<typeof useAuth> } = {};
  render(
    <AuthProvider>
      <Probe onValue={(value) => { ref.current = value; }} />
    </AuthProvider>
  );
  await waitFor(() => expect(ref.current?.loading).toBe(false));
  return { ref };
}

beforeEach(async () => {
  jest.clearAllMocks();
  if (typeof localStorage !== 'undefined') localStorage.clear();
  await apiClient.clearAuth();
});

describe('AuthProvider', () => {
  it('hydrates the user from a valid stored token', async () => {
    const token = VALID_TOKEN;
    if (Platform.OS === 'web') localStorage.setItem('motivation-calendar.auth-token', token);
    else secure.getItemAsync.mockResolvedValue(token);
    const { ref } = await latestValue();
    expect(ref.current?.user).toEqual({ id: 'u1', username: 'alice', email: 'a@b.com' });
  });

  it('ignores expired, anonymous and malformed stored tokens', async () => {
    for (const token of [
      EXPIRED_TOKEN,
      ANONYMOUS_TOKEN,
      'not-a-token',
      null,
    ]) {
      if (Platform.OS === 'web') {
        localStorage.clear();
        if (token) localStorage.setItem('motivation-calendar.auth-token', token);
      } else {
        secure.getItemAsync.mockResolvedValue(token);
      }
      const { ref } = await latestValue();
      expect(ref.current?.user).toBeNull();
      jest.clearAllMocks();
    }
  });

  it('logs in and persists the session', async () => {
    const { ref } = await latestValue();
    httpInstance().post.mockResolvedValueOnce({ data: { token: 't1', user: { id: 'u1', username: 'alice', email: 'a@b.com' } } });
    await ref.current!.login('alice', 'secret123');
    await waitFor(() => expect(ref.current?.user).toEqual({ id: 'u1', username: 'alice', email: 'a@b.com' }));
    expect(httpInstance().post).toHaveBeenCalledWith('/api/auth/login', { identifier: 'alice', password: 'secret123' }, undefined);
  });

  it('registers a new account', async () => {
    const { ref } = await latestValue();
    httpInstance().post.mockResolvedValueOnce({ data: { token: 't2', user: { id: 'u2', username: 'bob', email: 'b@b.com' } } });
    await ref.current!.register('bob', 'b@b.com', 'secret123');
    await waitFor(() => expect(ref.current?.user).toEqual({ id: 'u2', username: 'bob', email: 'b@b.com' }));
    expect(httpInstance().post).toHaveBeenCalledWith('/api/auth/register', { username: 'bob', email: 'b@b.com', password: 'secret123' }, undefined);
  });

  it('logs out and clears the stored token', async () => {
    const token = VALID_TOKEN;
    if (Platform.OS === 'web') localStorage.setItem('motivation-calendar.auth-token', token);
    else secure.getItemAsync.mockResolvedValue(token);
    const { ref } = await latestValue();
    expect(ref.current?.user).not.toBeNull();
    await ref.current!.logout();
    await waitFor(() => expect(ref.current?.user).toBeNull());
  });

  it('marks the session expired when the api client reports 401', async () => {
    const token = VALID_TOKEN;
    if (Platform.OS === 'web') localStorage.setItem('motivation-calendar.auth-token', token);
    else secure.getItemAsync.mockResolvedValue(token);
    const { ref } = await latestValue();
    expect(ref.current?.user).not.toBeNull();
    expect(ref.current?.sessionExpired).toBe(false);
    apiClient.onUnauthorized?.();
    await waitFor(() => expect(ref.current?.user).toBeNull());
    expect(ref.current?.sessionExpired).toBe(true);
  });

  it('clears the expired flag on login', async () => {
    const { ref } = await latestValue();
    apiClient.onUnauthorized?.();
    await waitFor(() => expect(ref.current?.sessionExpired).toBe(true));
    httpInstance().post.mockResolvedValueOnce({ data: { token: 't1', user: { id: 'u1', username: 'alice', email: 'a@b.com' } } });
    await ref.current!.login('alice', 'secret123');
    await waitFor(() => expect(ref.current?.sessionExpired).toBe(false));
  });

  it('throws when used outside the provider', () => {
    const Outside = () => { useAuth(); return null; };
    expect(() => render(<Outside />)).toThrow('useAuth must be used within AuthProvider');
  });
});
