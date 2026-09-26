import type { User } from '../../domain/types';

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  createdAt?: Date | string | null;
}

export interface RegistrationResponse {
  message: string;
  token: string;
  user: PublicUser;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: PublicUser;
}

/**
 * Puerto de presentación de respuestas de autenticación.
 * Implementación: infrastructure/presenters/auth.presenter.ts.
 */
export interface AuthPresenterPort {
  presentRegistration(user: User, token: string): RegistrationResponse;
  presentLogin(user: User, token: string): LoginResponse;
}
