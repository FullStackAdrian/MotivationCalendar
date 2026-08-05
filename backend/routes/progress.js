const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const db = require('../models/database');

/**
 * GET /api/progress
 * Obtener progreso del usuario autenticado
 */
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const progress = db.getUserProgress(userId);
  
  res.json({ progress });
});

/**
 * POST /api/progress
 * Guardar progreso completo del usuario autenticado
 */
router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { progress } = req.body;

  if (!progress || !Array.isArray(progress) || progress.length !== 366) {
    return res.status(400).json({ error: 'Progreso inválido' });
  }

  db.saveUserProgress(userId, progress);
  res.json({ message: 'Progreso guardado exitosamente', progress });
});

/**
 * PATCH /api/progress/:day
 * Actualizar un día específico del progreso
 */
router.patch('/:day', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const day = parseInt(req.params.day);

  if (isNaN(day) || day < 1 || day > 365) {
    return res.status(400).json({ error: 'Día inválido' });
  }

  const { state } = req.body;

  if (state === undefined || state < 0 || state > 3) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  const progress = db.updateDayProgress(userId, day, state);
  res.json({ message: 'Día actualizado', day, state, progress });
});

module.exports = router;
