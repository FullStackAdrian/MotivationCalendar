/**
 * Modelo de datos en memoria
 * Simula una base de datos para usuarios y progreso
 */

// Almacenamiento en memoria (en producción usar MongoDB/PostgreSQL)
const users = new Map();
const progressData = new Map();

/**
 * Crea un nuevo usuario
 * @param {string} username - Nombre de usuario
 * @param {string} email - Email del usuario
 * @param {string} hashedPassword - Contraseña hasheada
 * @returns {Object} Usuario creado sin contraseña
 */
const createUser = (username, email, hashedPassword) => {
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const user = {
    id: userId,
    username,
    email,
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };
  
  users.set(userId, user);
  progressData.set(userId, {});
  
  return { id: user.id, username: user.username, email: user.email };
};

/**
 * Busca un usuario por username o email
 * @param {string} identifier - Username o email
 * @returns {Object|null} Usuario encontrado o null
 */
const findUserByIdentifier = (identifier) => {
  for (const [, user] of users.entries()) {
    if (user.username === identifier || user.email === identifier) {
      return user;
    }
  }
  return null;
};

/**
 * Busca un usuario por ID
 * @param {string} userId - ID del usuario
 * @returns {Object|undefined} Usuario encontrado
 */
const findUserById = (userId) => {
  return users.get(userId);
};

/**
 * Obtiene el progreso de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Object} Progreso del usuario
 */
const getUserProgress = (userId) => {
  return progressData.get(userId) || {};
};

/**
 * Actualiza el progreso de un usuario
 * @param {string} userId - ID del usuario
 * @param {string} dayKey - Clave del día (YYYY-MM-DD)
 * @param {string} status - Estado del día
 * @returns {Object} Progreso actualizado
 */
const updateUserProgress = (userId, dayKey, status) => {
  const progress = progressData.get(userId) || {};
  progress[dayKey] = status;
  progressData.set(userId, progress);
  return progress;
};

/**
 * Elimina el progreso de un usuario (para testing)
 * @param {string} userId - ID del usuario
 */
const deleteUserProgress = (userId) => {
  progressData.delete(userId);
};

module.exports = {
  createUser,
  findUserByIdentifier,
  findUserById,
  getUserProgress,
  updateUserProgress,
  deleteUserProgress
};
