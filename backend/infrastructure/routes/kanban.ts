import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { KanbanService } from '../../domain/services/kanban.service';
import { verifyToken } from '../middleware/auth';
import { SequelizeBoardRepository } from '../repositories/sequelize-board.repository';
import { SequelizeColumnRepository } from '../repositories/sequelize-column.repository';
import { SequelizeTaskRepository } from '../repositories/sequelize-task.repository';
import { SequelizeUserRepository } from '../repositories/sequelize-user.repository';

const service = new KanbanService({
  userRepository: new SequelizeUserRepository(),
  boardRepository: new SequelizeBoardRepository(),
  columnRepository: new SequelizeColumnRepository(),
  taskRepository: new SequelizeTaskRepository()
});

const router: Router = Router();
router.use(verifyToken);

type AsyncHandler = (req: Request, res: Response) => Promise<unknown>;

const asyncRoute = (handler: AsyncHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

const userId = (req: Request): string => req.user!.userId;

/** Express 5 tipa los parámetros como string|string[]; en este router son siempre strings. */
const param = (req: Request, name: string): string => String(req.params[name]);

router.get('/boards', asyncRoute(async (req, res) => res.json(await service.listBoards(userId(req)))));
router.post('/boards', asyncRoute(async (req, res) => res.status(201).json(await service.createBoard(userId(req), req.body))));
router.get('/boards/:boardId', asyncRoute(async (req, res) => res.json(await service.getBoard(param(req, 'boardId'), userId(req), (req.query.today as string) || undefined))));
router.get('/boards/:boardId/members', asyncRoute(async (req, res) => res.json(await service.listMembers(param(req, 'boardId'), userId(req)))));
router.post('/boards/:boardId/members', asyncRoute(async (req, res) => res.status(201).json(await service.addMember(param(req, 'boardId'), userId(req), req.body.userId))));
router.get('/boards/:boardId/archive', asyncRoute(async (req, res) => res.json(await service.listArchive(param(req, 'boardId'), userId(req), req.query as { assigneeId?: string }))));

router.post('/boards/:boardId/columns', asyncRoute(async (req, res) => res.status(201).json(await service.createColumn(param(req, 'boardId'), userId(req), req.body))));
router.patch('/columns/:columnId', asyncRoute(async (req, res) => res.json(await service.updateColumn(param(req, 'columnId'), userId(req), req.body))));

router.patch('/boards/:boardId/columns/:columnId/position', asyncRoute(async (req, res) =>
  res.json(await service.reorderColumn(param(req, 'boardId'), userId(req), param(req, 'columnId'), Number(req.body.position)))));

router.post('/boards/:boardId/tasks', asyncRoute(async (req, res) =>
  res.status(201).json(await service.createTask(param(req, 'boardId'), userId(req), req.body))));

router.patch('/tasks/:taskId/move', asyncRoute(async (req, res) => {
  if (!req.body.date) {
    return res.json(await service.moveTask(param(req, 'taskId'), userId(req), req.body.columnId));
  }
  return res.json(await service.moveTaskOccurrence(param(req, 'taskId'), userId(req), req.body.columnId, req.body.date));
}));

router.post('/tasks/:taskId/complete', asyncRoute(async (req, res) =>
  res.json(await service.completeTask(param(req, 'taskId'), userId(req), req.body.date))));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.use((error: Error & { message: string }, req: Request, res: Response, _next: NextFunction) => {
  if (error.message === 'No autorizado') return res.status(403).json({ error: error.message });
  if (/no encontrado|obligatorio|inválid|límite|día de frecuencia|Tipo de frecuencia|Ocurrencia|asignado/i.test(error.message)) return res.status(400).json({ error: error.message });
  return _next(error);
});

export default router;
