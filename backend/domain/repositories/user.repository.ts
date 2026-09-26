import type { NewUserData, User } from '../types';

/**
 * Puerto de persistencia de usuarios.
 */
export interface UserRepository {
  /** Busca por username o email (email case-insensitive). */
  findByIdentifier(identifier: string): Promise<User | null>;
  /** Busca por email exacto. */
  findByEmail(email: string): Promise<User | null>;
  /** Busca por id. */
  findById(userId: string): Promise<User | null>;
  /** Crea el usuario con hash de contraseña ya calculado. */
  create(data: NewUserData): Promise<User>;
}
