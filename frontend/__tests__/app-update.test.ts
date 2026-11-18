import axios from 'axios';
import {
  AppUpdateRepository,
  resolveUpdateDownloadUrl,
  type AppInfo,
} from '@/infrastructure/download/app-update.repository';

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

const http = (): Record<'get' | 'post' | 'put' | 'patch' | 'delete', jest.Mock> =>
  (axios as unknown as { __instance: Record<'get' | 'post' | 'put' | 'patch' | 'delete', jest.Mock> }).__instance;

beforeEach(() => {
  jest.clearAllMocks();
});

const info: AppInfo = {
  apkUrl: '/downloads/motivation-calendar.apk',
  fileName: 'motivation-calendar.apk',
  version: '1.1.0',
  available: true,
  sizeBytes: 12345,
  updatedAt: '2026-11-18T00:00:00.000Z',
};

describe('app-update repository', () => {
  it('fetches the published app info from /api/downloads/info', async () => {
    http().get.mockResolvedValue({ data: info });
    const repository = new AppUpdateRepository();
    await expect(repository.getInfo()).resolves.toEqual(info);
    expect(http().get).toHaveBeenCalledWith('/api/downloads/info', undefined);
  });

  it('keeps absolute apk urls untouched', () => {
    const absolute: AppInfo = { ...info, apkUrl: 'https://cdn.example.com/app.apk' };
    expect(resolveUpdateDownloadUrl(absolute)).toBe('https://cdn.example.com/app.apk');
  });

  it('resolves relative apk paths against the api base', () => {
    expect(resolveUpdateDownloadUrl(info, 'https://api.example.com')).toBe(
      'https://api.example.com/downloads/motivation-calendar.apk'
    );
  });
});
