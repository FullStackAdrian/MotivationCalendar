/**
 * Aplicación principal del frontend
 * Maneja la UI, autenticación y sincronización con el backend
 */

// Referencias DOM
const grid = document.getElementById('grid');
const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
const appSection = document.getElementById('app-section');
const userInfo = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');

// Configuración
const TOTAL = 365;
const STORAGE_KEY = 'tracker2026';
const states = [null, 'done', 'partial', 'miss'];

// Estado de la aplicación
let clicks = new Array(TOTAL + 1).fill(0);
let currentUser = null;
let isServerAvailable = false;

// Calcular día del año actual
const today = new Date();
const yr = today.getFullYear();
let todayDoy;
if (yr === 2026) {
  todayDoy = Math.floor((today - new Date(2026, 0, 1)) / 86400000) + 1;
} else {
  todayDoy = yr < 2026 ? 0 : 366;
}

/* ── AUTENTICACIÓN ── */

function checkAuth() {
  if (window.apiClient.isAuthenticated()) {
    showApp();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginSection.style.display = 'block';
  registerSection.style.display = 'none';
  appSection.style.display = 'none';
}

function showRegister() {
  loginSection.style.display = 'none';
  registerSection.style.display = 'block';
  appSection.style.display = 'none';
}

async function showApp() {
  loginSection.style.display = 'none';
  registerSection.style.display = 'none';
  appSection.style.display = 'block';

  // Intentar cargar datos del servidor
  await loadFromServer();
  
  // Renderizar grid y estadísticas
  renderGrid();
  updateStats();
}

/* ── EVENTOS DE AUTENTICACIÓN ── */

document.getElementById('show-register').addEventListener('click', (e) => {
  e.preventDefault();
  showRegister();
});

document.getElementById('show-login').addEventListener('click', (e) => {
  e.preventDefault();
  showLogin();
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const identifier = document.getElementById('login-identifier').value;
  const password = document.getElementById('login-password').value;

  try {
    const result = await window.apiClient.login(identifier, password);
    currentUser = result.user;
    userInfo.textContent = `Hola, ${currentUser.username}`;
    await showApp();
  } catch (error) {
    alert(error.message || 'Error al iniciar sesión');
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  try {
    const result = await window.apiClient.register(username, email, password);
    currentUser = result.user;
    userInfo.textContent = `Hola, ${currentUser.username}`;
    await showApp();
  } catch (error) {
    alert(error.message || 'Error al registrar');
  }
});

logoutBtn.addEventListener('click', () => {
  window.apiClient.logout();
  currentUser = null;
  location.reload();
});

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
  let d = 0, p = 0, m = 0;
  for (let i = 1; i <= TOTAL; i++) {
    if (clicks[i] === 1) d++;
    else if (clicks[i] === 2) p++;
    else if (clicks[i] === 3) m++;
  }
  document.getElementById('cnt-done').textContent = d;
  document.getElementById('cnt-partial').textContent = p;
  document.getElementById('cnt-miss').textContent = m;
  document.getElementById('cnt-left').textContent = Math.max(0, TOTAL - todayDoy);
}

/* ── RENDERIZADO ── */

function applyState(el, i, locked) {
  el.className = 'day';
  if (clicks[i] === 0) {
    if (locked) el.classList.add('past');
    else if (i === todayDoy) el.classList.add('today');
    else el.classList.add('future');
  } else {
    el.classList.add('s-' + states[clicks[i]]);
  }
}

function renderGrid() {
  grid.innerHTML = '';
  
  for (let i = 1; i <= TOTAL; i++) {
    const el = document.createElement('div');
    const locked = i < todayDoy;

    applyState(el, i, locked);

    el.addEventListener('click', async () => {
      if (locked) {
        clicks[i] = clicks[i] === 0 ? 1 : (clicks[i] % 3) + 1;
      } else {
        clicks[i] = (clicks[i] + 1) % 4;
      }
      
      applyState(el, i, locked);
      saveToLocal();
      updateStats();
      
      // Sincronizar con servidor si está disponible
      if (isServerAvailable) {
        await saveToServer(i);
      }
    });

    grid.appendChild(el);
  }
}

/* ── INICIALIZACIÓN ── */

checkAuth();
