/**
 * Rutas de progreso.
 */
import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import type { ProgressStatus } from '../../domain/types';
import { verifyToken } from '../middleware/auth';
import {
  deleteUserProgress,
  getUserProgress,
  updateUserProgress,
  updateUserProgressBulk
} from '../models/database';

const router: Router = Router();

const VALID_STATUSES = new Set<ProgressStatus>(['completed', 'partial', 'failed']);
const DAY_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BULK_UPDATES = 500;

const isValidDayKey = (dayKey: string): boolean => {
  if (!DAY_KEY_REGEX.test(dayKey)) return false;

  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
};

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

const asyncRoute = (handler: AsyncHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(handler(req, res)).catch(next);

router.get('/', verifyToken, asyncRoute(async (req, res) => {
  const progress = await getUserProgress(req.user!.userId);
  res.json({ progress });
}));

router.put('/:dayKey', verifyToken, asyncRoute(async (req, res) => {
  const dayKey = String(req.params.dayKey);
  const status = req.body?.status as ProgressStatus;

  if (!isValidDayKey(dayKey)) {
    res.status(400).json({ error: 'Fecha inválida. Use una fecha real en formato YYYY-MM-DD' });
    return;
  }

  if (!VALID_STATUSES.has(status)) {
    res.status(400).json({
      error: 'Status inválido. Debe ser: completed, failed o partial'
    });
    return;
  }

  const progress = await updateUserProgress(req.user!.userId, dayKey, status);
  res.json({ message: 'Progreso actualizado', dayKey, status, progress });
}));

router.post('/bulk', verifyToken, asyncRoute(async (req, res) => {
  const updates = req.body?.updates as Record<string, ProgressStatus>;

  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    res.status(400).json({ error: 'Se requiere un objeto de actualizaciones' });
    return;
  }

  const entries = Object.entries(updates);
  if (entries.length > MAX_BULK_UPDATES) {
    res.status(400).json({ error: `No se permiten más de ${MAX_BULK_UPDATES} actualizaciones por petición` });
    return;
  }

  for (const [dayKey, status] of entries) {
    if (!isValidDayKey(dayKey)) {
      res.status(400).json({ error: `Fecha inválida: ${dayKey}` });
      return;
    }
    if (!VALID_STATUSES.has(status)) {
      res.status(400).json({ error: `Status inválido para ${dayKey}: ${status}` });
      return;
    }
  }

  const progress = await updateUserProgressBulk(req.user!.userId, updates);
  res.json({
    message: 'Progreso actualizado masivamente',
    updatedCount: entries.length,
    progress
  });
}));

router.delete('/', verifyToken, asyncRoute(async (req, res) => {
  const deletedCount = await deleteUserProgress(req.user!.userId);
  res.json({ message: 'Progreso eliminado', deletedCount });
}));

export default router;
