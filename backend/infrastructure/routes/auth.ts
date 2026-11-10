/**
 * Rutas de autenticación
 * Maneja registro y login de usuarios
 *
 * Arquitectura: Controller -> UseCase -> Service -> Repository (puertos)
 */
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { config } from '../config/config';

const router: Router = Router();

// BETA-1: anti fuerza-bruta en auth (429 JSON tras authRateLimitMax intentos/15min por IP).
// `max` como función para leer el entorno en cada petición (comprobable en tests).
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => Number(process.env.AUTH_RATE_LIMIT_MAX) || config.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Demasiadas peticiones. Inténtalo de nuevo en unos minutos.' });
  }
});

// Instancia del controlador (composition root del flujo auth)
const authController = new AuthController();

router.post('/register', authRateLimiter, (req, res) => authController.register(req, res));

router.post('/login', authRateLimiter, (req, res) => authController.login(req, res));

export default router;
