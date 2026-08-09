require('dotenv').config();

/**
 * Servidor principal de la API.
 * Configura Express, middlewares y rutas.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');

const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');

const app = express();

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

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Express 5 requires a named wildcard parameter.
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(err.message === 'No permitido por CORS' ? 403 : 500).json({
    error: config.nodeEnv === 'development' ? err.message : 'Error interno del servidor'
  });
});

if (require.main === module) {
  const PORT = config.port;
  const server = app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });

  const shutdown = (signal) => {
    console.log(`Recibido ${signal}. Cerrando servidor...`);
    server.close(() => process.exit(0));
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
