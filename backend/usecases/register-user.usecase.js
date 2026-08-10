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
    if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      throw new Error('Todos los campos son requeridos');
    }

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim();

    if (!normalizedUsername || !normalizedEmail || !password) {
      throw new Error('Todos los campos son requeridos');
    }

    if (normalizedUsername.length < 3 || normalizedUsername.length > 50) {
      throw new Error('El nombre de usuario debe tener entre 3 y 50 caracteres');
    }

    if (!this._isValidEmail(normalizedEmail)) {
      throw new Error('El email es inválido');
    }

    if (normalizedEmail.length > 255) {
      throw new Error('El email no puede superar 255 caracteres');
    }

    if (password.length < 6 || password.length > 72) {
      throw new Error('La contraseña debe tener entre 6 y 72 caracteres');
    }
  }

  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

module.exports = RegisterUserUseCase;
