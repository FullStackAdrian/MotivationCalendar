/**
 * Caso de uso: Registro de usuario.
 * Orquesta los middlewares (validación y gestión de errores) y, si no
 * saltan, delega en los servicios de dominio.
 */
import type { UserService } from '../../domain/services/user.service';
import type { AuthPresenterPort, RegistrationResponse } from '../ports/auth-presenter.port';
import type { ErrorHandlerPort } from '../ports/error-handler.port';
import type { PasswordHasherPort } from '../ports/password-hasher.port';
import type { TokenProviderPort } from '../ports/token-provider.port';
import type { ValidationMiddleware } from '../middlewares/validation.middleware';
import { registerUserSchema } from '../schemas/register-user.schema';

export interface RegisterUserUseCaseDependencies {
  userService: Pick<UserService, 'findByUsernameOrEmail' | 'createUser'>;
  validator: ValidationMiddleware;
  errorHandler: ErrorHandlerPort;
  passwordHasher: PasswordHasherPort;
  tokenProvider: TokenProviderPort;
  presenter: AuthPresenterPort;
}

export class RegisterUserUseCase {
  private readonly userService: Pick<UserService, 'findByUsernameOrEmail' | 'createUser'>;
  private readonly validator: ValidationMiddleware;
  private readonly errorHandler: ErrorHandlerPort;
  private readonly passwordHasher: PasswordHasherPort;
  private readonly tokenProvider: TokenProviderPort;
  private readonly presenter: AuthPresenterPort;

  constructor({ userService, validator, errorHandler, passwordHasher, tokenProvider, presenter }: RegisterUserUseCaseDependencies) {
    this.userService = userService;
    this.validator = validator;
    this.errorHandler = errorHandler;
    this.passwordHasher = passwordHasher;
    this.tokenProvider = tokenProvider;
    this.presenter = presenter;
  }

  async execute(input: unknown): Promise<RegistrationResponse> {
    return this.errorHandler.run(async () => {
      // 1. Middleware de validación: normaliza o lanza ValidationError
      const data = this.validator.validate(registerUserSchema, input);

      // 2. Regla de negocio: unicidad de usuario/email
      const existingUser = await this.userService.findByUsernameOrEmail(data.username, data.email);
      if (existingUser) {
        throw new Error('El usuario o email ya está registrado');
      }

      // 3. Hashing vía adaptador y persistencia
      const passwordHash = await this.passwordHasher.hash(data.password);
      const user = await this.userService.createUser({
        username: data.username,
        email: data.email,
        passwordHash
      });

      // 4. Token y presentación
      const token = this.tokenProvider.generate(user);
      return this.presenter.presentRegistration(user, token);
    });
  }
}
