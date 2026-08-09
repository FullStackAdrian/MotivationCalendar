/**
 * Caso de uso: Registro de usuario.
 */
const UserService = require('../services/user.service');
const AuthPresenter = require('../presenters/auth.presenter');

class RegisterUserUseCase {
  constructor(userService = new UserService(), presenter = new AuthPresenter()) {
    this.userService = userService;
    this.presenter = presenter;
  }

  async execute({ username, email, password }) {
    this._validateInput({ username, email, password });

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await this.userService.findByUsernameOrEmail(
      normalizedUsername,
      normalizedEmail
    );

    if (existingUser) {
      throw new Error('El usuario o email ya está registrado');
    }

    const user = await this.userService.createUser({
      username: normalizedUsername,
      email: normalizedEmail,
      password
    });

    const token = this.userService.generateToken(user);
    return this.presenter.presentRegistration(user, token);
  }

  _validateInput({ username, email, password }) {
    if (!username || !email || !password) {
      throw new Error('Todos los campos son requeridos');
    }

    if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 50) {
      throw new Error('El nombre de usuario debe tener entre 3 y 50 caracteres');
    }

    if (typeof email !== 'string' || !this._isValidEmail(email.trim())) {
      throw new Error('El email es inválido');
    }

    if (typeof password !== 'string' || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
  }

  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

module.exports = RegisterUserUseCase;
