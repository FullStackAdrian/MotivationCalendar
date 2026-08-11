import * as SecureStore from 'expo-secure-store';
import { TokenStorage } from '@/infrastructure/auth/token-storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('TokenStorage', () => {
  it('persists and retrieves the access token through SecureStore', async () => {
    const storage = new TokenStorage();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('token-123');

    await storage.set('token-123');
    await expect(storage.get()).resolves.toBe('token-123');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motivation-calendar.auth-token', 'token-123');
  });

  it('clears the token', async () => {
    const storage = new TokenStorage();

    await storage.clear();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('motivation-calendar.auth-token');
  });
});
