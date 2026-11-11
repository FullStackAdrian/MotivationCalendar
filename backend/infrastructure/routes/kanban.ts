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

// BETA-1: mapeo de errores de negocio a HTTP (función pura y testeable).
// Devuelve null cuando el error no es de negocio y debe seguir al handler global.
export function mapKanbanErrorResponse(error: Error & { message: string }): { status: number; body: { error: string } } | null {
  if (error.message === 'No autorizado') return { status: 403, body: { error: error.message } };
  // Recurso inexistente pero con acceso previo (p. ej. tablero borrado) → 404, no 500.
  if (error.message === 'Estado no encontrado') return { status: 404, body: { error: 'Tablero no encontrado' } };
  if (/no encontrado|obligatorio|inválid|límite|día de frecuencia|Tipo de frecuencia|Ocurrencia|asignado/i.test(error.message)) {
    return { status: 400, body: { error: error.message } };
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.use((error: Error & { message: string }, req: Request, res: Response, _next: NextFunction) => {
  const mapped = mapKanbanErrorResponse(error);
  if (mapped) return res.status(mapped.status).json(mapped.body);
  return _next(error);
});

export default router;
