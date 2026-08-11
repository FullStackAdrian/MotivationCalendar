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
      return res.status(201).json(result);
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  async login(req, res) {
    try {
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? req.body
        : {};
      const { identifier, password } = body;
      const result = await this.loginUseCase.execute({ identifier, password });
      return res.json(result);
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  mapErrorToStatus(message) {
    const errorMap = {
      'Credenciales inválidas': 401,
      'El usuario o email ya está registrado': 409,
      'Todos los campos son requeridos': 400,
      'El email es inválido': 400,
      'La contraseña debe tener entre 6 y 72 caracteres': 400,
      'El nombre de usuario debe tener entre 3 y 50 caracteres': 400,
      'El email no puede superar 255 caracteres': 400,
      'El identificador es inválido': 400,
      'La contraseña es requerida': 400
    };

    return errorMap[message] || 500;
  }

  _handleError(error, res) {
    console.error('Error en AuthController:', error);
    const statusCode = this.mapErrorToStatus(error.message);

    return res.status(statusCode).json({
      error: statusCode === 500 && process.env.NODE_ENV !== 'development'
        ? 'Error interno del servidor'
        : error.message
    });
  }
}

module.exports = AuthController;
