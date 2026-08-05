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

// Middlewares globales
app.use(cors({
  origin: '*', // En producción restringir a dominios específicos
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
