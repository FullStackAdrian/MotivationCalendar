/**
 * Adaptador de hashing de contraseñas.
 * Único punto del sistema que toca bcryptjs.
 * Implementa el puerto PasswordHasherPort de application.
 */
import bcrypt from 'bcryptjs';
import type { PasswordHasherPort } from '../../application/ports/password-hasher.port';

export class PasswordHasher implements PasswordHasherPort {
  readonly saltRounds: number;

  constructor(saltRounds = 10) {
    this.saltRounds = saltRounds;
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  compare(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
