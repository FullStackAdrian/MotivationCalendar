/**
 * Servicio de usuarios (dominio).
 * Solo lógica de dominio: unicidad y saneamiento.
 * La persistencia se delega en el puerto UserRepository.
 */
import type { UserRepository } from '../repositories/user.repository';
import type { NewUserData, User } from '../types';

export interface UserServiceDependencies {
  userRepository: UserRepository;
}

export class UserService {
  private readonly userRepository: UserRepository;

  constructor({ userRepository }: UserServiceDependencies) {
    this.userRepository = userRepository;
  }

  async findByUsernameOrEmail(identifier: string, email?: string): Promise<User | null> {
    const user = await this.userRepository.findByIdentifier(identifier);

    if (user) {
      return user;
    }

    // Backwards-compatible optional second lookup, useful for registration.
    return email ? this.userRepository.findByEmail(email) : null;
  }

  async createUser({ username, email, passwordHash }: NewUserData): Promise<User> {
    const user = await this.userRepository.create({ username, email, passwordHash });
    return this._sanitizeUser(user);
  }

  private _sanitizeUser(user: User | Record<string, unknown> | null): User {
    if (!user) return null as unknown as User;

    const plainUser = typeof (user as { toJSON?: () => unknown }).toJSON === 'function'
      ? ((user as unknown as { toJSON: () => unknown }).toJSON() as Record<string, unknown>)
      : (user as unknown as Record<string, unknown>);
    const { password: _omitted, ...sanitizedUser } = plainUser;
    return sanitizedUser as unknown as User;
  }
}
