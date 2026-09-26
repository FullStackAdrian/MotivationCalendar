/**
 * Presentador para respuestas de autenticación.
 * Implementa el puerto AuthPresenterPort de application.
 * Transforma los datos internos en formatos adecuados para la API response.
 */
import type { AuthPresenterPort, LoginResponse, PublicUser, RegistrationResponse } from '../../application/ports/auth-presenter.port';
import type { User } from '../../domain/types';

export class AuthPresenter implements AuthPresenterPort {
  presentRegistration(user: User, token: string): RegistrationResponse {
    return {
      message: 'Usuario registrado exitosamente',
      token,
      user: this._presentUser(user)
    };
  }

  presentLogin(user: User, token: string): LoginResponse {
    return {
      message: 'Login exitoso',
      token,
      user: this._presentUser(user)
    };
  }

  private _presentUser(user: User): PublicUser {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt || null
    };
  }
}
