import axios from 'axios';
import { Platform } from 'react-native';
import { ApiClient, ApiError, apiClient, defaultBaseUrl } from '@/infrastructure/http/api-client';

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  })),
}));
const mockedAxios = jest.mocked(axios);

interface MockHttp {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
  interceptors: {
    request: { use: jest.Mock };
    response: { use: jest.Mock };
  };
}

function mockInstance(): MockHttp {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
}

describe('defaultBaseUrl', () => {
  it('prefers EXPO_PUBLIC_API_URL and strips trailing slashes at construction', () => {
    const http = mockInstance();
    mockedAxios.create.mockReturnValueOnce(http as never);
    const client = new ApiClient('https://api.example.com/');
    expect(mockedAxios.create).toHaveBeenCalledWith(expect.objectContaining({ baseURL: 'https://api.example.com' }));
    expect(client).toBeInstanceOf(ApiClient);
  });

  it('resolves a usable default without a hardcoded host decision in tests', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(defaultBaseUrl()).toMatch(/^https?:\/\//);
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
    expect(defaultBaseUrl()).toBe('https://api.example.com');
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it('points Android emulators at 10.0.2.2 instead of localhost', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    try {
      delete process.env.EXPO_PUBLIC_API_URL;
      expect(defaultBaseUrl()).toBe('http://10.0.2.2:3000');
    } finally {
      jest.restoreAllMocks();
    }
  });
});

describe('ApiClient', () => {
  it('exposes a preconfigured singleton', () => {
    expect(apiClient).toBeInstanceOf(ApiClient);
    expect(apiClient.hasToken()).toBe(false);
    expect(apiClient.getToken()).toBeNull();
  });

  it('stores the token in memory and forwards it as Authorization', async () => {
    const http = mockInstance();
    mockedAxios.create.mockReturnValueOnce(http as never);
    const storage = { get: jest.fn(), set: jest.fn(), clear: jest.fn() };
    const client = new ApiClient('https://api.example.com', storage as never);
    const [[requestHandler]] = http.interceptors.request.use.mock.calls;
    await client.setToken('t123');
    expect(storage.set).toHaveBeenCalledWith('t123');
    expect(client.getToken()).toBe('t123');
    expect(requestHandler({ headers: {} }).headers.Authorization).toBe('Bearer t123');
    await client.setToken(null);
    expect(storage.clear).toHaveBeenCalled();
    expect(client.getToken()).toBeNull();
  });

  it('clears the session on 401 responses', async () => {
    const http = mockInstance();
    mockedAxios.create.mockReturnValueOnce(http as never);
    const storage = { get: jest.fn(), set: jest.fn(), clear: jest.fn() };
    const client = new ApiClient('https://api.example.com', storage as never);
    await client.setToken('t123');
    const [, onRejected] = http.interceptors.response.use.mock.calls[0];
    const failure = { response: { status: 401, data: { error: 'Sesión expirada' } } };
    await expect(onRejected(failure)).rejects.toBeInstanceOf(ApiError);
    expect(storage.clear).toHaveBeenCalled();
    expect(client.getToken()).toBeNull();
  });

  it('wraps non-401 failures in ApiError without logging out', async () => {
    const http = mockInstance();
    mockedAxios.create.mockReturnValueOnce(http as never);
    const storage = { get: jest.fn(), set: jest.fn(), clear: jest.fn() };
    const client = new ApiClient('https://api.example.com', storage as never);
    await client.setToken('t123');
    const [, onRejected] = http.interceptors.response.use.mock.calls[0];
    await expect(onRejected({ response: { status: 500, data: {} }, message: 'boom' })).rejects.toMatchObject({ status: 500 });
    expect(storage.clear).not.toHaveBeenCalled();
    expect(client.getToken()).toBe('t123');
  });
});
