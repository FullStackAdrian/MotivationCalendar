/**
 * Adaptador Sequelize del puerto UserRepository.
 */
import { Op } from 'sequelize';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type { NewUserData, User } from '../../domain/types';
import { UserModel } from '../models/database';

export class SequelizeUserRepository implements UserRepository {
  async findByIdentifier(identifier: string): Promise<User | null> {
    const user = await UserModel.findOne({
      where: {
        [Op.or]: [
          { username: identifier },
          { email: identifier.toLowerCase() }
        ]
      }
    });
    return user ? (user.toJSON() as unknown as User) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await UserModel.findOne({ where: { email: email.toLowerCase() } });
    return user ? (user.toJSON() as unknown as User) : null;
  }

  async findById(userId: string): Promise<User | null> {
    const user = await UserModel.findByPk(userId);
    return user ? (user.toJSON() as unknown as User) : null;
  }

  async create({ username, email, passwordHash }: NewUserData): Promise<User> {
    try {
      const user = await UserModel.create({ username, email, password: passwordHash });
      return user.toJSON() as unknown as User;
    } catch (error) {
      if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('El usuario o email ya está registrado');
      }
      throw error;
    }
  }
}
