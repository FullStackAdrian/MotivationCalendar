import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'motivation-calendar.auth-token';

const isWeb = Platform.OS === 'web';

export class TokenStorage {
  async get(): Promise<string | null> {
    if (isWeb) return localStorage.getItem(TOKEN_KEY);
    return SecureStore.getItemAsync(TOKEN_KEY);
  }

  async set(token: string): Promise<void> {
    if (isWeb) {
      localStorage.setItem(TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }

  async clear(): Promise<void> {
    if (isWeb) {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
