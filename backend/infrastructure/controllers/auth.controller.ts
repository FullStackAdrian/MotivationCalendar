/**
 * Controlador de autenticación.
 * Composition root del flujo auth: ensambla las dependencias de los usecases
 * (servicios de dominio + adaptadores de infraestructura + middlewares) y
 * traduce los códigos semánticos del ErrorHandlerMiddleware a HTTP.
 */
import type { Request, Response } from 'express';
import { ErrorHandlerMiddleware } from '../../application/middlewares/error-handler.middleware';
import { ValidationMiddleware } from '../../application/middlewares/validation.middleware';
import type { ApplicationError, ErrorCode } from '../../application/ports/error-handler.port';
import { LoginUserUseCase } from '../../application/usecases/login-user.usecase';
import { RegisterUserUseCase } from '../../application/usecases/register-user.usecase';
import { UserService } from '../../domain/services/user.service';
import { SequelizeUserRepository } from '../repositories/sequelize-user.repository';
import { AuthPresenter } from '../presenters/auth.presenter';
import { PasswordHasher } from '../security/password-hasher';
import { TokenProvider } from '../security/token-provider';

/** Traducción código semántico → estado HTTP (única preocupación HTTP del flujo). */
const CODE_TO_HTTP: Partial<Record<ErrorCode, number>> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  CONFLICT: 409
};

function normalizeBody(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

interface AuthControllerDependencies {
  registerUseCase?: RegisterUserUseCase;
  loginUseCase?: LoginUserUseCase;
}

export class AuthController {
  private readonly registerUseCase: RegisterUserUseCase;
  private readonly loginUseCase: LoginUserUseCase;

  constructor({ registerUseCase, loginUseCase }: AuthControllerDependencies = {}) {
    this.registerUseCase = registerUseCase || this._buildRegisterUseCase();
    this.loginUseCase = loginUseCase || this._buildLoginUseCase();
  }

  private _buildSharedDeps() {
    return {
      userService: new UserService({ userRepository: new SequelizeUserRepository() }),
      presenter: new AuthPresenter(),
      passwordHasher: new PasswordHasher(),
      tokenProvider: new TokenProvider(),
      validator: new ValidationMiddleware(),
      errorHandler: new ErrorHandlerMiddleware()
    };
  }

  private _buildRegisterUseCase(): RegisterUserUseCase {
    return new RegisterUserUseCase(this._buildSharedDeps());
  }

  private _buildLoginUseCase(): LoginUserUseCase {
    return new LoginUserUseCase(this._buildSharedDeps());
  }

  async register(req: Request, res: Response): Promise<Response> {
    try {
      const result = await this.registerUseCase.execute(normalizeBody(req.body));
      return res.status(201).json(result);
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const result = await this.loginUseCase.execute(normalizeBody(req.body));
      return res.json(result);
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  private _handleError(error: unknown, res: Response): Response {
    console.error('Error en AuthController:', error);
    const applicationError = error as ApplicationError;
    const statusCode = (applicationError.code && CODE_TO_HTTP[applicationError.code]) || 500;

    return res.status(statusCode).json({
      error: statusCode === 500 && process.env.NODE_ENV !== 'development'
        ? 'Error interno del servidor'
        : applicationError.message
    });
  }
}
