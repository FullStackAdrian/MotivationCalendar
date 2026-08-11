import axios from 'axios';
import { ApiClient } from '@/infrastructure/http/api-client';

autoMockAxios;

function autoMockAxios() {
  jest.mock('axios', () => ({
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    })),
  }));
}

describe('ApiClient contract', () => {
  it('uses the configured API base URL and exposes typed request methods', async () => {
    const client = new ApiClient('http://localhost:3000');
    const instance = (axios.create as jest.Mock).mock.results[0]?.value;
    instance.get.mockResolvedValue({ data: { ok: true } });

    await expect(client.get('/api/health')).resolves.toEqual({ ok: true });
    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({ baseURL: 'http://localhost:3000' }));
    expect(instance.get).toHaveBeenCalledWith('/api/health', expect.any(Object));
  });
});
