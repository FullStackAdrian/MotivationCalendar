/**
 * Controlador de autenticación
 * Maneja las requests HTTP relacionadas con auth y delega a los casos de uso
 */

const RegisterUserUseCase = require('../usecases/register-user.usecase');
const LoginUserUseCase = require('../usecases/login-user.usecase');

class AuthController {
  /**
   * @param {RegisterUserUseCase} registerUseCase - Caso de uso de registro
   * @param {LoginUserUseCase} loginUseCase - Caso de uso de login
   */
  constructor(
    registerUseCase = new RegisterUserUseCase(),
    loginUseCase = new LoginUserUseCase()
  ) {
    this.registerUseCase = registerUseCase;
    this.loginUseCase = loginUseCase;
  }

  /**
   * Maneja el registro de usuario
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const { username, email, password } = req.body;
      
      const result = await this.registerUseCase.execute({ 
        username, 
        email, 
        password 
      });
      
      res.status(201).json(result);
    } catch (error) {
      this._handleError(error, res);
    }
  }

  /**
   * Maneja el login de usuario
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { identifier, password } = req.body;
      
      const result = await this.loginUseCase.execute({ 
        identifier, 
        password 
      });
      
      res.json(result);
    } catch (error) {
      this._handleError(error, res);
    }
  }

  /**
   * Maneja errores de forma centralizada
   * @param {Error} error - Error capturado
   * @param {Object} res - Response de Express
   * @private
   */
  _handleError(error, res) {
    console.error('Error en AuthController:', error);
    
    // Errores de validación o negocio
    if (error.message.includes('requeridos') || 
        error.message.includes('inválido') ||
        error.message.includes('ya está registrado')) {
      return res.status(400).json({ error: error.message });
    }
    
    // Credenciales inválidas
    if (error.message === 'Credenciales inválidas') {
      return res.status(401).json({ error: error.message });
    }
    
    // Error por conflicto (usuario ya existe)
    if (error.message.includes('ya está registrado')) {
      return res.status(409).json({ error: error.message });
    }
    
    // Error genérico del servidor
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
    });
  }
}

module.exports = AuthController;
