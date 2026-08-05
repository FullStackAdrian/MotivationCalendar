/**
 * API Client para comunicación con el backend
 * Maneja todas las llamadas a la API REST
 */

const API_BASE_URL = window.location.origin + '/api';

/**
 * Obtiene el token de autenticación almacenado
 */
function getAuthToken() {
  return localStorage.getItem('authToken');
}

/**
 * Guarda el token de autenticación
 */
function saveAuthToken(token) {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

/**
 * Obtiene el usuario almacenado
 */
function getStoredUser() {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Guarda el usuario en localStorage
 */
function saveStoredUser(user) {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
}

/**
 * Registra un nuevo usuario
 */
async function registerUser(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.error || 'Error en el registro' };
    }
  } catch (error) {
    console.error('Error registrando:', error);
    return { success: false, error: 'Error de conexión con el servidor' };
  }
}

/**
 * Inicia sesión con un usuario existente
 */
async function loginUser(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.error || 'Credenciales inválidas' };
    }
  } catch (error) {
    console.error('Error logueando:', error);
    return { success: false, error: 'Error de conexión con el servidor' };
  }
}

/**
 * Cierra sesión eliminando tokens y datos del usuario
 */
function logoutUser() {
  saveAuthToken(null);
  saveStoredUser(null);
}

/**
 * Obtiene el progreso del usuario autenticado
 */
async function getUserProgress() {
  const token = getAuthToken();
  
  if (!token) {
    return { success: false, error: 'No autenticado' };
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/progress`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else if (response.status === 401 || response.status === 403) {
      logoutUser();
      return { success: false, error: 'Sesión expirada' };
    } else {
      return { success: false, error: 'Error al cargar progreso' };
    }
  } catch (error) {
    console.error('Error cargando progreso:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

/**
 * Guarda el progreso completo del usuario
 */
async function saveUserProgress(progress) {
  const token = getAuthToken();
  
  if (!token) {
    // Guardar solo en localStorage si no hay auth
    return { success: false, error: 'No autenticado' };
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ progress })
    });
    
    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, error: 'Error al guardar progreso' };
    }
  } catch (error) {
    console.error('Error guardando progreso:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

/**
 * Actualiza un día específico del progreso
 */
async function updateDayProgress(day, state) {
  const token = getAuthToken();
  
  if (!token) {
    return { success: false, error: 'No autenticado' };
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/progress/${day}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state })
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      return { success: false, error: 'Error al actualizar día' };
    }
  } catch (error) {
    console.error('Error actualizando día:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

// Exportar funciones para uso global
window.API = {
  getAuthToken,
  saveAuthToken,
  getStoredUser,
  saveStoredUser,
  registerUser,
  loginUser,
  logoutUser,
  getUserProgress,
  saveUserProgress,
  updateDayProgress
};
