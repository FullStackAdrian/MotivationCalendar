/**
 * Rutas de progreso.
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getUserProgress,
  updateUserProgress,
  updateUserProgressBulk
} = require('../models/database');

const VALID_STATUSES = new Set(['completed', 'partial', 'failed']);
const DAY_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BULK_UPDATES = 500;

const isValidDayKey = (dayKey) => {
  if (!DAY_KEY_REGEX.test(dayKey)) return false;

  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
};

router.get('/', verifyToken, async (req, res) => {
  try {
    const progress = await getUserProgress(req.user.userId);
    res.json({ progress });
  } catch (error) {
    console.error('Error al obtener progreso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:dayKey', verifyToken, async (req, res) => {
  try {
    const { dayKey } = req.params;
    const { status } = req.body;

    if (!isValidDayKey(dayKey)) {
      return res.status(400).json({ error: 'Fecha inválida. Use una fecha real en formato YYYY-MM-DD' });
    }

    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({
        error: 'Status inválido. Debe ser: completed, failed o partial'
      });
    }

    const progress = await updateUserProgress(req.user.userId, dayKey, status);
    res.json({ message: 'Progreso actualizado', dayKey, status, progress });
  } catch (error) {
    console.error('Error al actualizar progreso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/bulk', verifyToken, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ error: 'Se requiere un objeto de actualizaciones' });
    }

    const entries = Object.entries(updates);
    if (entries.length > MAX_BULK_UPDATES) {
      return res.status(400).json({ error: `No se permiten más de ${MAX_BULK_UPDATES} actualizaciones por petición` });
    }

    for (const [dayKey, status] of entries) {
      if (!isValidDayKey(dayKey)) {
        return res.status(400).json({ error: `Fecha inválida: ${dayKey}` });
      }
      if (!VALID_STATUSES.has(status)) {
        return res.status(400).json({ error: `Status inválido para ${dayKey}: ${status}` });
      }
    }

    const progress = await updateUserProgressBulk(req.user.userId, updates);
    res.json({
      message: 'Progreso actualizado masivamente',
      updatedCount: entries.length,
      progress
    });
  } catch (error) {
    console.error('Error al actualizar progreso masivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
