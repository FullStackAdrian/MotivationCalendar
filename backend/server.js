/**
 * Servidor principal de la API
 * Configura Express, middlewares y rutas
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');

// Importar rutas
const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');

// Crear instancia de Express
const app = express();

// Configuración de CORS más segura
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('github.io')) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de requests (desarrollo)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Servir frontend estático
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Wildcard route para SPA (debe ir después de las rutas de API)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    error: config.nodeEnv === 'development' ? err.message : 'Error interno del servidor'
  });
});

// Iniciar servidor
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  🚀 Servidor corriendo en puerto ${PORT}      ║
║  📍 http://localhost:${PORT}                 ║
║  🔧 Environment: ${config.nodeEnv.padEnd(21)}║
╚════════════════════════════════════════════╝
  `);
});

module.exports = app;
