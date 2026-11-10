import { Platform } from 'react-native';
import './helpers/polyfill-storage';
import * as SecureStore from 'expo-secure-store';
import { TokenStorage } from '@/infrastructure/auth/token-storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const secure = jest.mocked(SecureStore);

beforeEach(() => {
  jest.clearAllMocks();
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

const webStorage = () => {
  if (typeof localStorage === 'undefined') throw new Error('web-only');
  return localStorage;
};

describe('TokenStorage', () => {
  it('uses SecureStore outside the web', async () => {
    if (Platform.OS === 'web') return;
    secure.getItemAsync.mockResolvedValueOnce('tok');
    const storage = new TokenStorage();
    await expect(storage.get()).resolves.toBe('tok');
    await storage.set('tok');
    expect(secure.setItemAsync).toHaveBeenCalledWith('motivation-calendar.auth-token', 'tok');
    await storage.clear();
    expect(secure.deleteItemAsync).toHaveBeenCalledWith('motivation-calendar.auth-token');
  });

  it('uses localStorage on the web', async () => {
    if (Platform.OS !== 'web') return;
    const storage = new TokenStorage();
    await expect(storage.get()).resolves.toBeNull();
    await storage.set('tok');
    expect(webStorage().getItem('motivation-calendar.auth-token')).toBe('tok');
    await expect(storage.get()).resolves.toBe('tok');
    await storage.clear();
    expect(webStorage().getItem('motivation-calendar.auth-token')).toBeNull();
    expect(secure.setItemAsync).not.toHaveBeenCalled();
  });
});
