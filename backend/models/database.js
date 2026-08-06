/**
 * Modelo de datos con persistencia en PostgreSQL usando Sequelize ORM
 * Reemplaza la implementación en memoria por una base de datos real
 */

const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/config');

// Configuración de conexión a PostgreSQL
const sequelize = new Sequelize(
  process.env.DATABASE_URL || `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'motivation_calendar'}`,
  {
    dialect: 'postgres',
    logging: config.nodeEnv === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Modelo User
const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
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

// Modelo Progress (para guardar el progreso diario)
const Progress = sequelize.define('Progress', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  dayKey: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Clave del día en formato YYYY-MM-DD'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['completed', 'locked', '']]
    }
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'progress',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'dayKey']
    }
  ]
});

// Relación entre User y Progress
User.hasMany(Progress, { foreignKey: 'userId', as: 'progress' });
Progress.belongsTo(User, { foreignKey: 'userId' });

/**
 * Inicializa la base de datos (crea tablas si no existen)
 * @returns {Promise<void>}
 */
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida correctamente');
    
    // Sincronizar modelos (crear tablas si no existen)
    await sequelize.sync({ alter: config.nodeEnv === 'development' });
    console.log('✅ Tablas sincronizadas correctamente');
  } catch (error) {
    console.error('❌ Error al conectar con PostgreSQL:', error.message);
    throw error;
  }
};

/**
 * Crea un nuevo usuario
 * @param {string} username - Nombre de usuario
 * @param {string} email - Email del usuario
 * @param {string} hashedPassword - Contraseña hasheada
 * @returns {Object} Usuario creado sin contraseña
 */
const createUser = async (username, email, hashedPassword) => {
  try {
    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });
    
    return { 
      id: user.id, 
      username: user.username, 
      email: user.email,
      createdAt: user.createdAt 
    };
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error('El username o email ya existe');
    }
    throw error;
  }
};

/**
 * Busca un usuario por username o email
 * @param {string} identifier - Username o email
 * @returns {Object|null} Usuario encontrado o null
 */
const findUserByIdentifier = async (identifier) => {
  const user = await User.findOne({
    where: {
      username: identifier
    }
  });
  
  if (!user) {
    // Intentar buscar por email
    const userByEmail = await User.findOne({
      where: { email: identifier }
    });
    return userByEmail;
  }
  
  return user;
};

/**
 * Busca un usuario por ID
 * @param {string} userId - ID del usuario
 * @returns {Object|null} Usuario encontrado o null
 */
const findUserById = async (userId) => {
  return await User.findByPk(userId);
};

/**
 * Busca un usuario por email
 * @param {string} email - Email del usuario
 * @returns {Object|null} Usuario encontrado o null
 */
const findUserByEmail = async (email) => {
  return await User.findOne({
    where: { email }
  });
};

/**
 * Busca un usuario por cualquier campo especificado
 * @param {string} field - Nombre del campo (username, email, id)
 * @param {string} value - Valor a buscar
 * @returns {Object|null} Usuario encontrado o null
 */
const getUserByField = async (field, value) => {
  const validFields = ['username', 'email', 'id'];
  if (!validFields.includes(field)) {
    throw new Error(`Campo inválido: ${field}. Campos válidos: ${validFields.join(', ')}`);
  }
  
  return await User.findOne({
    where: { [field]: value }
  });
};

/**
 * Obtiene el progreso de un usuario como objeto { dayKey: status }
 * @param {string} userId - ID del usuario
 * @returns {Object} Progreso del usuario
 */
const getUserProgress = async (userId) => {
  const progressRecords = await Progress.findAll({
    where: { userId }
  });
  
  // Convertir array a objeto { dayKey: status }
  const progress = {};
  progressRecords.forEach(record => {
    progress[record.dayKey] = record.status;
  });
  
  return progress;
};

/**
 * Actualiza el progreso de un usuario para un día específico
 * Usa upsert para crear o actualizar según exista
 * @param {string} userId - ID del usuario
 * @param {string} dayKey - Clave del día (YYYY-MM-DD)
 * @param {string} status - Estado del día
 * @returns {Object} Progreso actualizado
 */
const updateUserProgress = async (userId, dayKey, status) => {
  await Progress.upsert({
    userId,
    dayKey,
    status,
    updatedAt: new Date()
  });
  
  // Retornar todo el progreso actualizado
  return await getUserProgress(userId);
};

/**
 * Elimina el progreso de un usuario (para testing o reset)
 * @param {string} userId - ID del usuario
 */
const deleteUserProgress = async (userId) => {
  await Progress.destroy({
    where: { userId }
  });
};

/**
 * Cierra la conexión a la base de datos
 * @returns {Promise<void>}
 */
const closeDatabase = async () => {
  await sequelize.close();
  console.log('🔒 Conexión a PostgreSQL cerrada');
};

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
  deleteUserProgress,
  closeDatabase
};
