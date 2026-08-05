const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);

// Obtener información del usuario actual
const authenticateToken = require('./middleware/auth');
app.get('/api/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Catch-all para servir el frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(config.PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${config.PORT}`);
  console.log('API endpoints disponibles:');
  console.log('  POST /api/auth/register - Registrar usuario');
  console.log('  POST /api/auth/login    - Iniciar sesión');
  console.log('  GET  /api/progress      - Obtener progreso (requiere auth)');
  console.log('  POST /api/progress      - Guardar progreso (requiere auth)');
  console.log('  PATCH /api/progress/:day - Actualizar día (requiere auth)');
});
