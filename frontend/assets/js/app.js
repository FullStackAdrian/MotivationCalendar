/**
 * Aplicación principal del frontend
 * Maneja la UI, autenticación y sincronización con el backend
 * Arquitectura MVC refactorizada usando Views
 */

// Configuración
const TOTAL = 365;
const STORAGE_KEY = 'tracker2026';
const states = [null, 'done', 'partial', 'miss'];

// Estado de la aplicación
let clicks = new Array(TOTAL + 1).fill(0);
let currentUser = null;
let isServerAvailable = false;

// Instancias de las Views
let loginView = null;
let registerView = null;
let mainView = null;

// Contenedor principal de la app
const appContainer = document.getElementById('app');

/* ── INICIALIZACIÓN DE VISTAS ── */

function initializeViews() {
  loginView = new LoginView(appContainer);
  registerView = new RegisterView(appContainer);
  mainView = new MainView(appContainer);
  
  // Configurar eventos de navegación entre vistas
  setupNavigationEvents();
}

function setupNavigationEvents() {
  // Login -> Register
  loginView.onShowRegister(() => {
    loginView.hide();
    registerView.show();
  });
  
  // Register -> Login
  registerView.onShowLogin(() => {
    registerView.hide();
    loginView.show();
  });
}

/* ── AUTENTICACIÓN ── */

function checkAuth() {
  initializeViews();
  
  if (window.apiClient.isAuthenticated()) {
    showApp();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginView.show();
  registerView.hide();
  mainView.hide();
}

function showRegister() {
  loginView.hide();
  registerView.show();
  mainView.hide();
}

async function showApp() {
  loginView.hide();
  registerView.hide();
  
  // Obtener usuario actual
  const user = window.apiClient.getCurrentUser();
  if (user) {
    currentUser = user;
    mainView.show(user);
    
    // Configurar evento de logout
    mainView.onLogout(handleLogout);
    
    // Intentar cargar datos del servidor
    await loadFromServer();
    
    // Renderizar grid y estadísticas
    mainView.renderGrid(clicks, handleDayClick);
    updateStats();
  } else {
    // Si no hay usuario, volver al login
    showLogin();
  }
}

function handleLogout() {
  window.apiClient.logout();
  currentUser = null;
  clicks = new Array(TOTAL + 1).fill(0);
  showLogin();
}

async function handleDayClick(dayNum, locked) {
  if (locked) {
    clicks[dayNum] = clicks[dayNum] === 0 ? 1 : (clicks[dayNum] % 3) + 1;
  } else {
    clicks[dayNum] = (clicks[dayNum] + 1) % 4;
  }
  
  // Actualizar visualmente solo el día modificado
  mainView.updateDayVisual(dayNum, clicks, locked);
  saveToLocal();
  updateStats();
  
  // Sincronizar con servidor si está disponible
  if (isServerAvailable) {
    await saveToServer(dayNum);
  }
}

/* ── SINCRONIZACIÓN ── */

async function loadFromServer() {
  try {
    const response = await window.apiClient.getProgress();
    syncProgress(response.progress);
    isServerAvailable = true;
    console.log('Datos cargados del servidor');
  } catch (error) {
    console.log('Modo offline: usando localStorage');
    loadFromLocal();
    isServerAvailable = false;
  }
}

function loadFromLocal() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      clicks = JSON.parse(saved);
      if (!Array.isArray(clicks) || clicks.length !== TOTAL + 1) {
        clicks = new Array(TOTAL + 1).fill(0);
      }
    }
  } catch (e) {
    clicks = new Array(TOTAL + 1).fill(0);
  }
}

function syncProgress(serverProgress) {
  // Convertir formato del servidor al formato local
  for (const [dayKey, status] of Object.entries(serverProgress)) {
    const dayNum = dateToDayNumber(dayKey);
    if (dayNum >= 1 && dayNum <= TOTAL) {
      clicks[dayNum] = statusToIndex(status);
    }
  }
  saveToLocal();
}

async function saveToServer(dayNum) {
  if (!isServerAvailable || !currentUser) return;
  
  try {
    const dayKey = dayNumberToDate(dayNum);
    const status = indexToStatus(clicks[dayNum]);
    if (status) {
      await window.apiClient.updateDay(dayKey, status);
    }
  } catch (error) {
    console.error('Error al sincronizar:', error);
    isServerAvailable = false;
  }
}

function saveToLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clicks));
  } catch (e) {}
}

/* ── UTILIDADES DE FECHA ── */

function dateToDayNumber(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const start = new Date('2026-01-01T00:00:00');
  const diff = Math.floor((date - start) / 86400000) + 1;
  return diff;
}

function dayNumberToDate(dayNum) {
  const start = new Date('2026-01-01T00:00:00');
  const date = new Date(start.getTime() + (dayNum - 1) * 86400000);
  return date.toISOString().split('T')[0];
}

function statusToIndex(status) {
  if (status === 'completed') return 1;
  if (status === 'partial') return 2;
  if (status === 'failed') return 3;
  return 0;
}

function indexToStatus(index) {
  if (index === 1) return 'completed';
  if (index === 2) return 'partial';
  if (index === 3) return 'failed';
  return null;
}

/* ── ESTADÍSTICAS ── */

function updateStats() {
  // Calcular día del año actual
  const today = new Date();
  const yr = today.getFullYear();
  let todayDoy;
  if (yr === 2026) {
    todayDoy = Math.floor((today - new Date(2026, 0, 1)) / 86400000) + 1;
  } else {
    todayDoy = yr < 2026 ? 0 : 366;
  }
  
  let d = 0, p = 0, m = 0;
  for (let i = 1; i <= TOTAL; i++) {
    if (clicks[i] === 1) d++;
    else if (clicks[i] === 2) p++;
    else if (clicks[i] === 3) m++;
  }
  
  // Usar la vista para actualizar estadísticas
  mainView.updateStats({
    done: d,
    partial: p,
    miss: m,
    left: Math.max(0, TOTAL - todayDoy)
  });
}

/* ── EVENTOS DE AUTENTICACIÓN ── */

// Configurar eventos de login y registro usando las Views
function setupAuthEvents() {
  // Login
  loginView.onSubmit(async (data) => {
    loginView.setLoading(true);
    
    try {
      const result = await window.apiClient.login(data.identifier, data.password);
      currentUser = result.user;
      loginView.clearForm();
      await showApp();
    } catch (error) {
      loginView.showError(error.message || 'Error al iniciar sesión');
    } finally {
      loginView.setLoading(false);
    }
  });
  
  // Registro
  registerView.onSubmit(async (data) => {
    registerView.setLoading(true);
    
    try {
      const result = await window.apiClient.register(data.username, data.email, data.password);
      currentUser = result.user;
      registerView.clearForm();
      await showApp();
    } catch (error) {
      registerView.showError(error.message || 'Error al registrar');
    } finally {
      registerView.setLoading(false);
    }
  });
}

/* ── INICIALIZACIÓN ── */

// Inicializar aplicación
checkAuth();
setupAuthEvents();
