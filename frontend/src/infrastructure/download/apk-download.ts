import { defaultBaseUrl } from '../http/api-client';

export const APK_FILE_NAME = 'motivation-calendar.apk';
export const APK_FILE_PATH = `/downloads/${APK_FILE_NAME}`;

/**
 * URL de descarga del APK.
 * - Si EXPO_PUBLIC_ANDROID_APK_URL está definida (Release/EAS), se usa tal cual.
 * - Si no, se deriva del mismo backend que usa la web (EXPO_PUBLIC_API_URL o
 *   base explícita), de modo que el APK descargado ya habla con ese servidor.
 * - Con base vacía (web tras nginx con proxy) devuelve ruta relativa /downloads/….
 */
export function getApkDownloadUrl(apiBaseUrl?: string): string {
  const override = process.env.EXPO_PUBLIC_ANDROID_APK_URL;
  if (override && override.trim().length > 0) return override.trim();
  // Sin base explícita se usa la misma resolución que el resto de la app
  // (respeta proxy nginx con '' y corrige localhost horneado en páginas LAN).
  const raw = apiBaseUrl ?? defaultBaseUrl();
  const base = (raw ?? '').trim();
  if (!base) return APK_FILE_PATH;
  return `${base.replace(/\/$/, '')}${APK_FILE_PATH}`;
}
