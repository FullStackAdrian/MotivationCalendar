/**
 * Rutas de autenticación
 * Maneja registro y login de usuarios
 * 
 * Arquitectura: Controller -> UseCase -> Service -> Repository
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');

// Instancia del controlador
const authController = new AuthController();

/**
 * POST /api/auth/register
 * Registra un nuevo usuario
 */
router.post('/register', (req, res) => authController.register(req, res));

/**
 * POST /api/auth/login
 * Inicia sesión de usuario
 */
router.post('/login', (req, res) => authController.login(req, res));

module.exports = router;
