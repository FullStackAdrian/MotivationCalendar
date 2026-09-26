/**
 * Caso de uso: Login de usuario.
 * Orquesta los middlewares (validación y gestión de errores) y, si no
 * saltan, delega en los servicios de dominio.
 */
import type { UserService } from '../../domain/services/user.service';
import type { AuthPresenterPort, LoginResponse } from '../ports/auth-presenter.port';
import type { ErrorHandlerPort } from '../ports/error-handler.port';
import type { PasswordHasherPort } from '../ports/password-hasher.port';
import type { TokenProviderPort } from '../ports/token-provider.port';
import type { ValidationMiddleware } from '../middlewares/validation.middleware';
import { loginUserSchema } from '../schemas/login-user.schema';

export interface LoginUserUseCaseDependencies {
  userService: Pick<UserService, 'findByUsernameOrEmail'>;
  validator: ValidationMiddleware;
  errorHandler: ErrorHandlerPort;
  passwordHasher: PasswordHasherPort;
  tokenProvider: TokenProviderPort;
  presenter: AuthPresenterPort;
}

export class LoginUserUseCase {
  private readonly userService: Pick<UserService, 'findByUsernameOrEmail'>;
  private readonly validator: ValidationMiddleware;
  private readonly errorHandler: ErrorHandlerPort;
  private readonly passwordHasher: PasswordHasherPort;
  private readonly tokenProvider: TokenProviderPort;
  private readonly presenter: AuthPresenterPort;

  constructor({ userService, validator, errorHandler, passwordHasher, tokenProvider, presenter }: LoginUserUseCaseDependencies) {
    this.userService = userService;
    this.validator = validator;
    this.errorHandler = errorHandler;
    this.passwordHasher = passwordHasher;
    this.tokenProvider = tokenProvider;
    this.presenter = presenter;
  }

  async execute(input: unknown): Promise<LoginResponse> {
    return this.errorHandler.run(async () => {
      // 1. Middleware de validación: normaliza o lanza ValidationError
      const data = this.validator.validate(loginUserSchema, input);

      // 2. Búsqueda del usuario
      const user = await this.userService.findByUsernameOrEmail(data.identifier);
      if (!user) {
        throw new Error('Credenciales inválidas');
      }

      // 3. Comparación de contraseña vía adaptador
      const isValidPassword = await this.passwordHasher.compare(data.password, user.password ?? '');
      if (!isValidPassword) {
        throw new Error('Credenciales inválidas');
      }

      // 4. Token y presentación
      const token = this.tokenProvider.generate(user);
      return this.presenter.presentLogin(user, token);
    });
  }
}
