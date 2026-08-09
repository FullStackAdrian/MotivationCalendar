/**
 * Persistencia PostgreSQL mediante Sequelize.
 */
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/config');

const databaseUrl = process.env.DATABASE_URL ||
  `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'motivation_calendar'}`;

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: config.nodeEnv === 'development' ? console.log : false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
});

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: false
});

const Progress = sequelize.define('Progress', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: User, key: 'id' },
    onDelete: 'CASCADE'
  },
  dayKey: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Clave del día en formato YYYY-MM-DD'
  },
  status: {
    type: DataTypes.ENUM('completed', 'partial', 'failed'),
    allowNull: false
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'progress',
  timestamps: false,
  indexes: [{ unique: true, fields: ['userId', 'dayKey'] }]
});

User.hasMany(Progress, { foreignKey: 'userId', as: 'progress', onDelete: 'CASCADE' });
Progress.belongsTo(User, { foreignKey: 'userId' });

const initializeDatabase = async () => {
  await sequelize.authenticate();
  console.log('Conexión a PostgreSQL establecida correctamente');
  await sequelize.sync({ alter: config.nodeEnv === 'development' });
};

const createUser = async (username, email, hashedPassword) => {
  try {
    const user = await User.create({ username, email, password: hashedPassword });
    return user.toJSON();
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error('El username o email ya existe');
    }
    throw error;
  }
};

const findUserByIdentifier = async (identifier) => User.findOne({
  where: {
    [require('sequelize').Op.or]: [
      { username: identifier },
      { email: identifier.toLowerCase() }
    ]
  }
});

const findUserById = async (userId) => User.findByPk(userId);
const findUserByEmail = async (email) => User.findOne({ where: { email: email.toLowerCase() } });

const getUserByField = async (field, value) => {
  const validFields = ['username', 'email', 'id'];
  if (!validFields.includes(field)) {
    throw new Error(`Campo inválido: ${field}. Campos válidos: ${validFields.join(', ')}`);
  }
  return User.findOne({ where: { [field]: value } });
};

const getUserProgress = async (userId) => {
  const records = await Progress.findAll({ where: { userId } });
  return Object.fromEntries(records.map((record) => [record.dayKey, record.status]));
};

const updateUserProgress = async (userId, dayKey, status) => {
  await Progress.upsert({ userId, dayKey, status, updatedAt: new Date() });
  return getUserProgress(userId);
};

const updateUserProgressBulk = async (userId, updates) => {
  await sequelize.transaction(async (transaction) => {
    for (const [dayKey, status] of Object.entries(updates)) {
      await Progress.upsert(
        { userId, dayKey, status, updatedAt: new Date() },
        { transaction }
      );
    }
  });

  return getUserProgress(userId);
};

const deleteUserProgress = async (userId) => Progress.destroy({ where: { userId } });
const closeDatabase = async () => sequelize.close();

module.exports = {
  sequelize,
  User,
  Progress,
  initializeDatabase,
  createUser,
  findUserByIdentifier,
  findUserByEmail,
  getUserByField,
  findUserById,
  getUserProgress,
  updateUserProgress,
  updateUserProgressBulk,
  deleteUserProgress,
  closeDatabase
};
