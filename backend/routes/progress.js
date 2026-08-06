/**
 * Rutas de progreso
 * Maneja el CRUD del progreso diario de usuarios
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getUserProgress, updateUserProgress } = require('../models/database');

/**
 * GET /api/progress
 * Obtiene todo el progreso del usuario autenticado
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const progress = await getUserProgress(req.user.userId);
    res.json({ progress });
  } catch (error) {
    console.error('Error al obtener progreso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /api/progress/:dayKey
 * Actualiza el estado de un día específico
 * dayKey formato: YYYY-MM-DD
 */
router.put('/:dayKey', verifyToken, async (req, res) => {
  try {
    const { dayKey } = req.params;
    const { status } = req.body;

    // Validar formato de fecha
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dayKey)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }

    // Validar status
    const validStatuses = ['completed', 'partial', 'failed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Status inválido. Debe ser: completed, failed, o partial'
      });
    }

    const progress = await updateUserProgress(req.user.userId, dayKey, status);
    res.json({
      message: 'Progreso actualizado',
      dayKey,
      status,
      progress
    });
  } catch (error) {
    console.error('Error al actualizar progreso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/progress/bulk
 * Actualiza múltiples días a la vez
 */
router.post('/bulk', verifyToken, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Se requiere un objeto de actualizaciones' });
    }

    const validStatuses = ['completed', 'partial', 'failed'];
    const userId = req.user.userId;

    for (const [dayKey, status] of Object.entries(updates)) {
      // Validar formato de fecha
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dayKey)) {
        return res.status(400).json({ error: `Formato de fecha inválido: ${dayKey}` });
      }

      // Validar status
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Status inválido para ${dayKey}: ${status}` });
      }

      // Actualizar cada día individualmente
      await updateUserProgress(userId, dayKey, status);
    }

    const progress = await getUserProgress(userId);
    res.json({
      message: 'Progreso actualizado masivamente',
      updatedCount: Object.keys(updates).length,
      progress
    });
  } catch (error) {
    console.error('Error al actualizar progreso masivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
