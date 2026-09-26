/**
 * Puerto de hashing de contraseñas.
 * Implementación: infrastructure/security/password-hasher.ts (bcryptjs).
 */
export interface PasswordHasherPort {
  hash(password: string): Promise<string>;
  compare(password: string, hashedPassword: string): Promise<boolean>;
}
