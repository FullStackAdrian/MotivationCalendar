import 'dotenv/config';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { config } from './infrastructure/config/config';
import authRoutes from './infrastructure/routes/auth';
import kanbanRoutes from './infrastructure/routes/kanban';
import progressRoutes from './infrastructure/routes/progress';
import { closeDatabase, initializeDatabase, sequelize } from './infrastructure/models/database';
// Registro de modelos y asociaciones kanban (import con efectos)
import './infrastructure/models/kanban.database';

const app = express();
app.disable('x-powered-by');
// BETA-1: IP real tras los proxies de confianza (rate-limit correcto tras nginx).
app.set('trust proxy', config.trustProxyHops);

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // BETA-1: el backend es API-only (JSON); endurecer el framing/tipos por defecto.
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  // BETA-1: HSTS solo en producción (en local/test se sirve por HTTP).
  // Se lee process.env en cada petición para que sea comprobable en tests.
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

interface CorsError extends Error {
  message: string;
}

const allowedOrigins = config.allowedOrigins;
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('No permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

if (config.nodeEnv === 'development') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/kanban', kanbanRoutes);

app.get('/api/health', async (req: Request, res: Response) => {
  try {
    await sequelize.authenticate();
    // BETA-1: respuesta mínima, sin detalles de entorno.
    res.json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

// BETA-1: el backend es 100% API-only → las rutas desconocidas son JSON 404,
// nunca el HTML por defecto de Express.
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'No encontrado' });
});

interface HttpError extends Error {
  type?: string;
  status?: number;
  statusCode?: number;
}

app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
  console.error('Error no manejado:', err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload demasiado grande' });
  if (err.message === 'No permitido por CORS') return res.status(403).json({ error: config.nodeEnv === 'development' ? err.message : 'Origen no permitido' });
  return res.status(500).json({ error: config.nodeEnv === 'development' ? err.message : 'Error interno del servidor' });
});

export async function startServer(): Promise<void> {
  await initializeDatabase();
  const PORT = config.port;
  const server = app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Recibido ${signal}. Cerrando servidor...`);
    server.close(async () => {
      try { await closeDatabase(); process.exit(0); }
      catch (error) { console.error('Error al cerrar PostgreSQL:', error); process.exit(1); }
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

export default app;

if (require.main === module) {
  startServer().catch((error) => {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  });
}
