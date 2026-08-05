// Base de datos en memoria (en producción usar MongoDB, PostgreSQL, etc.)
const users = new Map();
const userProgress = new Map();

/**
 * Verifica si un usuario existe
 */
function userExists(username) {
  return users.has(username);
}

/**
 * Crea un nuevo usuario
 */
function createUser(userId, username, hashedPassword) {
  users.set(username, {
    id: userId,
    username,
    password: hashedPassword,
    createdAt: new Date().toISOString()
  });
  
  // Inicializar progreso vacío para el usuario
  userProgress.set(userId, new Array(366).fill(0));
}

/**
 * Obtiene un usuario por username
 */
function getUserByUsername(username) {
  return users.get(username);
}

/**
 * Obtiene el progreso de un usuario
 */
function getUserProgress(userId) {
  let progress = userProgress.get(userId);
  
  if (!progress) {
    progress = new Array(366).fill(0);
    userProgress.set(userId, progress);
  }
  
  return progress;
}

/**
 * Guarda el progreso completo de un usuario
 */
function saveUserProgress(userId, progress) {
  userProgress.set(userId, progress);
}

/**
 * Actualiza un día específico del progreso
 */
function updateDayProgress(userId, day, state) {
  let progress = getUserProgress(userId);
  progress[day] = state;
  userProgress.set(userId, progress);
  return progress;
}

module.exports = {
  userExists,
  createUser,
  getUserByUsername,
  getUserProgress,
  saveUserProgress,
  updateDayProgress
};
