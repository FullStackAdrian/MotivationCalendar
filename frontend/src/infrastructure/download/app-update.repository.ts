import { apiClient } from '@/infrastructure/http/api-client';
import { getApkDownloadUrl } from './apk-download';

export interface AppInfo {
  apkUrl: string;
  fileName: string;
  version: string;
  available: boolean;
  sizeBytes: number | null;
  updatedAt: string | null;
}

/** Info publicada por el backend (GET /api/downloads/info): versión + APK. */
export class AppUpdateRepository {
  getInfo() {
    return apiClient.get<AppInfo>('/api/downloads/info');
  }
}

/**
 * URL absoluta de descarga del APK de actualización.
 * - El servidor manda ruta relativa (`/downloads/…`): se resuelve contra
 *   la misma base que usa la app (respeta proxy nginx y corrección LAN).
 * - Si algún día el servidor manda URL absoluta (CDN), se usa tal cual.
 */
export function resolveUpdateDownloadUrl(info: AppInfo, apiBaseUrl?: string): string {
  const apkUrl = (info.apkUrl ?? '').trim();
  if (/^https?:\/\//i.test(apkUrl)) return apkUrl;
  return getApkDownloadUrl(apiBaseUrl);
}
