import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'motivation-calendar.auth-token';

export class TokenStorage {
  async get(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }

  async set(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
