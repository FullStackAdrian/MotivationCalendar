/**
 * Descarga del APK Android.
 * El APK se publica junto al backend (mismo origen que la API que usa la web),
 * de modo que el binario ya lleva horneado el EXPO_PUBLIC_API_URL del despliegue.
 */
import { Router, type Request, type Response } from 'express';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const APK_FILE_NAME = 'motivation-calendar.apk';
export const APK_DOWNLOAD_PATH = `/downloads/${APK_FILE_NAME}`;

export function resolveApkPath(): string {
  if (process.env.APK_PATH) return process.env.APK_PATH;
  return join(process.cwd(), 'backend', 'downloads', APK_FILE_NAME);
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
  res.json({ apkUrl: APK_DOWNLOAD_PATH, fileName: APK_FILE_NAME });
});

export default downloadsRouter;
