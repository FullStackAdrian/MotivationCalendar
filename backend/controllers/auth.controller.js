/**
 * Controlador de autenticación.
 * Traduce casos de uso a respuestas HTTP.
 */
const RegisterUserUseCase = require('../usecases/register-user.usecase');
const LoginUserUseCase = require('../usecases/login-user.usecase');

class AuthController {
  constructor(
    registerUseCase = new RegisterUserUseCase(),
    loginUseCase = new LoginUserUseCase()
  ) {
    this.registerUseCase = registerUseCase;
    this.loginUseCase = loginUseCase;
  }

  async register(req, res) {
    try {
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? req.body
        : {};
      const { username, email, password } = body;
      const result = await this.registerUseCase.execute({ username, email, password });
      res.status(201).json(result);
    } catch (error) {
      this._handleError(error, res);
    }
  }

  async login(req, res) {
    try {
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? req.body
        : {};
      const { identifier, password } = body;
      const result = await this.loginUseCase.execute({ identifier, password });
      res.json(result);
    } catch (error) {
      this._handleError(error, res);
    }
  }

  _handleError(error, res) {
    console.error('Error en AuthController:', error);

    if (error.message === 'Credenciales inválidas') {
      return res.status(401).json({ error: error.message });
    }

    if (error.message.includes('ya está registrado')) {
      return res.status(409).json({ error: error.message });
    }

    if (
      error.message.includes('requeridos') ||
      error.message.includes('inválido') ||
      error.message.includes('debe tener') ||
      error.message.includes('no puede superar')
    ) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Error interno del servidor'
    });
  }
}

module.exports = AuthController;
