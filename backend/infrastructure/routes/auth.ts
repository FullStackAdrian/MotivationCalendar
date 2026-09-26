/**
 * Rutas de autenticación
 * Maneja registro y login de usuarios
 *
 * Arquitectura: Controller -> UseCase -> Service -> Repository (puertos)
 */
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router: Router = Router();

// Instancia del controlador (composition root del flujo auth)
const authController = new AuthController();

router.post('/register', (req, res) => authController.register(req, res));

router.post('/login', (req, res) => authController.login(req, res));

export default router;
