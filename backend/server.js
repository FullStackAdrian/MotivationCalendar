require('dotenv').config();

/**
 * Servidor principal de la API.
 * Configura Express, middlewares y rutas.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const { initializeDatabase, sequelize, closeDatabase } = require('./models/database');

const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const allowedOrigins = config.allowedOrigins;

app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin (curl, server-to-server, health checks) are allowed.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('No permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);

app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      database: 'unavailable'
    });
  }
});

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Express 5 requires a named wildcard parameter.
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload demasiado grande' });
  }

  if (err.message === 'No permitido por CORS') {
    return res.status(403).json({ error: 'Origen no permitido' });
  }

  return res.status(500).json({
    error: config.nodeEnv === 'development' ? err.message : 'Error interno del servidor'
  });
});

const startServer = async () => {
  await initializeDatabase();

  const PORT = config.port;
  const server = app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Recibido ${signal}. Cerrando servidor...`);
    server.close(async () => {
      try {
        await closeDatabase();
        process.exit(0);
      } catch (error) {
        console.error('Error al cerrar PostgreSQL:', error);
        process.exit(1);
      }
    });
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  });
}

module.exports = app;
