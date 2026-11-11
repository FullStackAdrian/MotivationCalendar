/**
 * Seeder demo idempotente SOLO para staging (BETA-5 / P.4).
 * Sin `SEED_DEMO=true` no hace nada. Doble ejecución no duplica datos:
 * reutiliza el usuario y el tablero demo si ya existen.
 *
 * Uso: `SEED_DEMO=true DATABASE_URL=... npx tsx scripts/seed-demo.ts`
 */
import 'dotenv/config';
import { KanbanService } from '../backend/domain/services/kanban.service';
import type { Board } from '../backend/domain/types';
import type { User } from '../backend/domain/types';
import { SequelizeBoardRepository } from '../backend/infrastructure/repositories/sequelize-board.repository';
import { SequelizeColumnRepository } from '../backend/infrastructure/repositories/sequelize-column.repository';
import { SequelizeTaskRepository } from '../backend/infrastructure/repositories/sequelize-task.repository';
import { SequelizeUserRepository } from '../backend/infrastructure/repositories/sequelize-user.repository';
import { PasswordHasher } from '../backend/infrastructure/security/password-hasher';
import {
  closeDatabase,
  createUser,
  findUserByEmail,
  initializeDatabase
} from '../backend/infrastructure/models/database';

export const DEMO_BOARD_NAME = 'Tablero demo';
const DEMO_BOARDS = [
  { name: 'Tablero demo', description: 'Datos de ejemplo para probar la beta en staging', color: '#6366f1' },
  { name: 'Proyecto demo', description: 'Pizarra de ejemplo para organizar trabajo' },
  { name: 'Hábitos demo', description: 'Pizarra de ejemplo para hábitos diarios' }
];
const DEMO_TASKS = ['Primera tarea de ejemplo', 'Segunda tarea de ejemplo'];
const DEMO_PASSWORD = 'Demo1234!';

export interface SeedDemoResult {
  skipped: boolean;
  created?: boolean;
  user?: User;
  board?: Board;
  boards?: Board[];
}

function buildService(): KanbanService {
  return new KanbanService({
    userRepository: new SequelizeUserRepository(),
    boardRepository: new SequelizeBoardRepository(),
    columnRepository: new SequelizeColumnRepository(),
    taskRepository: new SequelizeTaskRepository()
  });
}

export async function seedDemo({ emailPrefix = 'demo' }: { emailPrefix?: string } = {}): Promise<SeedDemoResult> {
  if (process.env.SEED_DEMO !== 'true') {
    return { skipped: true };
  }
  const email = `${emailPrefix}@example.com`.toLowerCase();
  let created = false;
  let user = await findUserByEmail(email);
  if (!user) {
    user = await createUser(emailPrefix, email, await new PasswordHasher().hash(DEMO_PASSWORD));
    created = true;
  }
  const service = buildService();
  const visible = await service.listBoards(user.id);
  const boards: Board[] = [];
  for (const spec of DEMO_BOARDS) {
    let board = visible.find((item) => item.name === spec.name) ?? null;
    if (!board) {
      const details = await service.createBoard(user.id, {
        name: spec.name,
        description: spec.description
      });
      board = { id: details.id, name: details.name, description: details.description, color: details.color, ownerId: details.ownerId } as Board;
      created = true;
    }
    boards.push(board);
  }
  // Tareas de ejemplo en la primera pizarra (idempotente por título).
  const firstDetails = await service.getBoard(boards[0].id, user.id);
  const firstColumn = firstDetails.columns[0];
  const existingTitles = new Set((firstDetails.tasks ?? []).map((task) => task.title));
  if (firstColumn) {
    for (const title of DEMO_TASKS) {
      if (!existingTitles.has(title)) {
        await service.createTask(boards[0].id, user.id, { title, columnId: firstColumn.id });
        created = true;
      }
    }
  }
  const board = boards.find((item) => item.name === DEMO_BOARD_NAME) ?? boards[0];
  return { skipped: false, created, user, board, boards };
}

if (require.main === module) {
  (async () => {
    await initializeDatabase();
    const result = await seedDemo();
    if (result.skipped) {
      console.log('Seed demo omitido (SEED_DEMO != true). Nada que hacer en producción.');
    } else {
      console.log(`Seed demo listo: usuario y ${DEMO_BOARDS.length} tableros${result.created ? ' creados' : ' ya existentes'}.`);
    }
    await closeDatabase();
  })().catch(async (error) => {
    console.error('Seed demo falló:', error);
    try {
      await closeDatabase();
    } catch {
      // ignorar: ya estamos fallando
    }
    process.exit(1);
  });
}
