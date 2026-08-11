const express = require('express');
const { verifyToken } = require('../middleware/auth');
const KanbanService = require('../services/kanban.service');
const { BoardMember } = require('../models/kanban.database');
const { User } = require('../models/database');

const router = express.Router();
const service = new KanbanService();
router.use(verifyToken);
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const userId = req => req.user.userId;

router.get('/boards', asyncRoute(async (req, res) => res.json(await service.listBoards(userId(req)))));
router.post('/boards', asyncRoute(async (req, res) => res.status(201).json(await service.createBoard(userId(req), req.body))));
router.get('/boards/:boardId', asyncRoute(async (req, res) => res.json(await service.getBoard(req.params.boardId, userId(req)))));
router.get('/boards/:boardId/members', asyncRoute(async (req, res) => {
  if (!(await service.isMember(req.params.boardId, userId(req)))) throw new Error('No autorizado');
  const members = await BoardMember.findAll({ where: { boardId: req.params.boardId }, include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email'] }] });
  res.json(members.map(member => member.user));
}));
router.post('/boards/:boardId/members', asyncRoute(async (req, res) => res.status(201).json(await service.addMember(req.params.boardId, userId(req), req.body.userId))));
router.get('/boards/:boardId/archive', asyncRoute(async (req, res) => res.json(await service.listArchive(req.params.boardId, userId(req), req.query))));
router.post('/boards/:boardId/columns', asyncRoute(async (req, res) => res.status(201).json(await service.createColumn(req.params.boardId, userId(req), req.body))));
router.patch('/columns/:columnId', asyncRoute(async (req, res) => res.json(await service.updateColumn(req.params.columnId, userId(req), req.body))));
router.patch('/boards/:boardId/columns/:columnId/position', asyncRoute(async (req, res) => res.json(await service.reorderColumn(req.params.boardId, userId(req), req.params.columnId, Number(req.body.position)))));
router.post('/boards/:boardId/tasks', asyncRoute(async (req, res) => res.status(201).json(await service.createTask(req.params.boardId, userId(req), req.body))));
router.patch('/tasks/:taskId/move', asyncRoute(async (req, res) => res.json(await service.moveTask(req.params.taskId, userId(req), req.body.columnId))));
router.post('/tasks/:taskId/complete', asyncRoute(async (req, res) => res.json(await service.completeTask(req.params.taskId, userId(req), req.body.date))));
router.use((error, req, res, next) => {
  if (error.message === 'No autorizado') return res.status(403).json({ error: error.message });
  if (/no encontrado|obligatorio|inválid|límite|día de frecuencia|Tipo de frecuencia/i.test(error.message)) return res.status(400).json({ error: error.message });
  return next(error);
});
module.exports = router;
