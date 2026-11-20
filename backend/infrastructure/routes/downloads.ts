/**
 * Descarga del APK Android.
 * El APK se publica junto al backend (mismo origen que la API que usa la web),
 * de modo que el binario ya lleva horneado el EXPO_PUBLIC_API_URL del despliegue.
 */
import { Router, type Request, type Response } from 'express';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const APK_FILE_NAME = 'motivation-calendar.apk';
export const APK_DOWNLOAD_PATH = `/downloads/${APK_FILE_NAME}`;

export function resolveApkPath(): string {
  if (process.env.APK_PATH) return process.env.APK_PATH;
  return join(process.cwd(), 'backend', 'downloads', APK_FILE_NAME);
}

/** Versión publicable de la app: override de despliegue o `version` del package raíz. */
export function getAppVersion(): string {
  const fromEnv = (process.env.APP_VERSION ?? '').trim();
  if (fromEnv.length > 0) return fromEnv;
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { version?: unknown };
    if (typeof pkg.version === 'string' && pkg.version.trim().length > 0) return pkg.version.trim();
  } catch {
    // Sin package.json legible (p. ej. imagen mínima): versión desconocida.
  }
  return '0.0.0';
}

export interface ApkInfo {
  apkUrl: string;
  fileName: string;
  version: string;
  available: boolean;
  sizeBytes: number | null;
  updatedAt: string | null;
}

export function getApkInfo(): ApkInfo {
  const apkPath = resolveApkPath();
  const exists = existsSync(apkPath) && statSync(apkPath).isFile();
  if (!exists) {
    return {
      apkUrl: APK_DOWNLOAD_PATH,
      fileName: APK_FILE_NAME,
      version: getAppVersion(),
      available: false,
      sizeBytes: null,
      updatedAt: null,
    };
  }
  const stat = statSync(apkPath);
  return {
    apkUrl: APK_DOWNLOAD_PATH,
    fileName: APK_FILE_NAME,
    version: getAppVersion(),
    available: true,
    sizeBytes: stat.size,
    updatedAt: stat.mtime.toISOString(),
  };
}

async function sendApk(_req: Request, res: Response): Promise<void> {
  const apkPath = resolveApkPath();
  if (!existsSync(apkPath) || !statSync(apkPath).isFile()) {
    res.status(404).json({ error: 'APK no publicado todavía' });
    return;
  }
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', `attachment; filename="${APK_FILE_NAME}"`);
  res.sendFile(apkPath);
}

const downloadsRouter: Router = Router();
downloadsRouter.get(`/${APK_FILE_NAME}`, (req: Request, res: Response) => {
  void sendApk(req, res);
});

export const downloadsInfoRouter: Router = Router();
downloadsInfoRouter.get('/info', (_req: Request, res: Response) => {
  res.json(getApkInfo());
});

export default downloadsRouter;
