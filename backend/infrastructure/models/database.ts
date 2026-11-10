/**
 * Persistencia PostgreSQL mediante Sequelize.
 * Modelos class-based con InferAttributes (tipado completo de columnas).
 */
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Op,
  Sequelize
} from 'sequelize';
import { config } from '../config/config';
import type { ProgressStatus, User } from '../../domain/types';

const databaseUrl = process.env.DATABASE_URL ||
  `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'motivation_calendar'}`;

// A.5.4: en test el pool debe fallar rápido (no 30s por operación sin BD).
// Overridable vía TEST_ACQUIRE_TIMEOUT para runners lentos de CI.
const isTestEnv = process.env.NODE_ENV === 'test';
const acquireTimeout = Number(process.env.TEST_ACQUIRE_TIMEOUT) || (isTestEnv ? 5000 : 30000);

export const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: config.nodeEnv === 'development' ? console.log : false,
  pool: { max: 10, min: 0, acquire: acquireTimeout, idle: 10000 },
  retry: { max: isTestEnv ? 1 : 3 }
});

/** A.5.5: detecta errores por Postgres caído (ECONNREFUSED/5432/timeout de pool). */
export function isDatabaseUnavailableError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException)?.code ?? '';
  const parentMessage = (error as { parent?: Error })?.parent?.message ?? '';
  const message = error instanceof Error
    ? `${error.message} ${code} ${parentMessage}`
    : String(error);
  return /ECONNREFUSED|ENOTFOUND|ConnectionAcquireTimeout|ConnectionRefused|5432/i.test(message);
}

/**
 * A.5.5: ante Postgres caído, conserva el mensaje original y añade el hint
 * accionable (`npm run test:db:up`). Cualquier otro error se devuelve intacto.
 */
export function formatDatabaseError(error: unknown): Error {
  const original = error instanceof Error ? error : new Error(String(error));
  if (!isDatabaseUnavailableError(original)) return original;
  if (original.message.includes('npm run test:db:up')) return original;
  const hinted = new Error(
    `${original.message}\nPostgres no disponible → npm run test:db:up (o \`sh scripts/test-db-up.sh\`)`
  );
  (hinted as NodeJS.ErrnoException).code = (original as NodeJS.ErrnoException).code;
  (hinted as Error & { cause?: unknown }).cause = original;
  return hinted;
}

export class UserModel extends Model<InferAttributes<UserModel>, InferCreationAttributes<UserModel>> {
  declare id: CreationOptional<string>;
  declare username: string;
  declare email: string;
  declare password: string;
  declare createdAt: CreationOptional<Date>;
}

UserModel.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: { len: [3, 50] }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: { type: DataTypes.STRING, allowNull: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  sequelize,
  tableName: 'users',
  timestamps: false
});

export class ProgressModel extends Model<InferAttributes<ProgressModel>, InferCreationAttributes<ProgressModel>> {
  declare id: CreationOptional<number>;
  declare userId: string;
  declare dayKey: string;
  declare status: ProgressStatus;
  declare updatedAt: CreationOptional<Date>;
}

ProgressModel.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: UserModel, key: 'id' },
    onDelete: 'CASCADE'
  },
  dayKey: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Clave del día en formato YYYY-MM-DD'
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { isIn: [['completed', 'partial', 'failed']] }
  },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  sequelize,
  tableName: 'progress',
  timestamps: false,
  indexes: [{ unique: true, fields: ['userId', 'dayKey'] }]
});

UserModel.hasMany(ProgressModel, { foreignKey: 'userId', as: 'progress', onDelete: 'CASCADE' });
ProgressModel.belongsTo(UserModel, { foreignKey: 'userId' });

export async function initializeDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('Conexión a PostgreSQL establecida correctamente');

    // `sync()` only creates missing tables and is safe for startup in all environments.
    // Schema-altering migrations can be introduced later without coupling startup to them.
    await sequelize.sync();
  } catch (error) {
    // A.5.5: hint accionable cuando Postgres no está levantado.
    throw formatDatabaseError(error);
  }
}

export async function createUser(username: string, email: string, hashedPassword: string): Promise<User> {
  try {
    const user = await UserModel.create({ username, email, password: hashedPassword });
    return user.toJSON() as unknown as User;
  } catch (error) {
    if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
      throw new Error('El usuario o email ya está registrado');
    }
    throw error;
  }
}

export async function findUserByIdentifier(identifier: string): Promise<User | null> {
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

export async function findUserByEmail(email: string): Promise<User | null> {
  const user = await UserModel.findOne({ where: { email: email.toLowerCase() } });
  return user ? (user.toJSON() as unknown as User) : null;
}

export async function getUserByField(field: string, value: string): Promise<User | null> {
  const validFields: string[] = ['username', 'email', 'id'];
  if (!validFields.includes(field)) {
    throw new Error(`Campo inválido: ${field}. Campos válidos: ${validFields.join(', ')}`);
  }
  const user = await UserModel.findOne({ where: { [field]: value } });
  return user ? (user.toJSON() as unknown as User) : null;
}

export async function getUserProgress(userId: string): Promise<Record<string, ProgressStatus>> {
  const records = await ProgressModel.findAll({ where: { userId } });
  return Object.fromEntries(records.map((record) => [record.dayKey, record.status]));
}

export async function updateUserProgress(userId: string, dayKey: string, status: ProgressStatus): Promise<Record<string, ProgressStatus>> {
  await ProgressModel.upsert({ userId, dayKey, status, updatedAt: new Date() });
  return getUserProgress(userId);
}

export async function updateUserProgressBulk(userId: string, updates: Record<string, ProgressStatus>): Promise<Record<string, ProgressStatus>> {
  await sequelize.transaction(async (transaction) => {
    for (const [dayKey, status] of Object.entries(updates)) {
      await ProgressModel.upsert(
        { userId, dayKey, status, updatedAt: new Date() },
        { transaction }
      );
    }
  });

  return getUserProgress(userId);
}

export async function deleteUserProgress(userId: string): Promise<number> {
  return ProgressModel.destroy({ where: { userId } });
}

export async function closeDatabase(): Promise<void> {
  await sequelize.close();
}
