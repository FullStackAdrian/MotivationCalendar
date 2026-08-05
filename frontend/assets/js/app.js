const grid = document.getElementById('grid');
const TOTAL = 365;
const STORAGE_KEY = 'tracker2026';

const today = new Date();
const yr = today.getFullYear();
let todayDoy;
if (yr === 2026) {
  todayDoy = Math.floor((today - new Date(2026, 0, 1)) / 86400000) + 1;
} else {
  todayDoy = yr < 2026 ? 0 : 366;
}

const states = [null, 'done', 'partial', 'miss'];

/* ── AUTH STATE ── */
let currentUser = null;
let authToken = null;
let useLocalMode = false;

/**
 * Inicializa el estado de autenticación desde localStorage
 */
function initAuthState() {
  authToken = API.getAuthToken();
  const user = API.getStoredUser();
  
  if (authToken && user) {
    currentUser = user;
    useLocalMode = false;
  }
}

/**
 * Actualiza la UI según el estado de autenticación
 */
function updateAuthUI() {
  const authContainer = document.getElementById('auth-container');
  if (!authContainer) return;
  
  if (currentUser) {
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('username-display').textContent = currentUser.username;
  } else {
    document.getElementById('auth-form').style.display = 'flex';
    document.getElementById('user-info').style.display = 'none';
  }
}

/* ── PERSISTENCE ── */
let clicks;

/**
 * Carga el progreso del usuario (servidor o localStorage)
 */
async function loadProgress() {
  initAuthState();
  
  if (currentUser && authToken) {
    updateAuthUI();
    
    const result = await API.getUserProgress();
    
    if (result.success) {
      clicks = result.data.progress;
      if (!Array.isArray(clicks) || clicks.length !== TOTAL + 1) {
        clicks = new Array(TOTAL + 1).fill(0);
      }
      useLocalMode = false;
      return;
    } else {
      // Token inválido, limpiar y usar modo local
      logout();
    }
  }
  
  // Modo local (sin autenticación)
  useLocalMode = true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    clicks = saved ? JSON.parse(saved) : new Array(TOTAL + 1).fill(0);
    if (!Array.isArray(clicks) || clicks.length !== TOTAL + 1) {
      clicks = new Array(TOTAL + 1).fill(0);
    }
  } catch (e) {
    clicks = new Array(TOTAL + 1).fill(0);
  }
}

/**
 * Guarda el progreso (servidor si hay auth, sino localStorage)
 */
function save() {
  if (!useLocalMode && authToken) {
    // Guardar en el servidor (asíncrono, no bloqueante)
    API.saveUserProgress(clicks).catch(e => 
      console.error('Error guardando progreso:', e)
    );
  }
  
  // Siempre guardar en localStorage como backup
  try { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clicks)); 
  } catch (e) {}
}

/* ── STATS ── */
function updateStats() {
  let d = 0, p = 0, m = 0;
  for (let i = 1; i <= TOTAL; i++) {
    if      (clicks[i] === 1) d++;
    else if (clicks[i] === 2) p++;
    else if (clicks[i] === 3) m++;
  }
  document.getElementById('cnt-done').textContent    = d;
  document.getElementById('cnt-partial').textContent = p;
  document.getElementById('cnt-miss').textContent    = m;
  document.getElementById('cnt-left').textContent    = Math.max(0, TOTAL - todayDoy);
}

/* ── RENDER DAY ── */
function applyState(el, i, locked) {
  el.className = 'day';
  if (clicks[i] === 0) {
    if (locked)            el.classList.add('past');
    else if (i === todayDoy) el.classList.add('today');
    else                   el.classList.add('future');
  } else {
    el.classList.add('s-' + states[clicks[i]]);
  }
}

/* ── BUILD GRID ── */
for (let i = 1; i <= TOTAL; i++) {
  const el = document.createElement('div');
  const locked = i < todayDoy;

  applyState(el, i, locked);

  if (locked) {
    el.addEventListener('click', () => {
      clicks[i] = clicks[i] === 0 ? 1 : (clicks[i] % 3) + 1;
      applyState(el, i, true);
      save();
      updateStats();
    });
  } else {
    el.addEventListener('click', () => {
      clicks[i] = (clicks[i] + 1) % 4;
      applyState(el, i, false);
      save();
      updateStats();
    });
  }

  grid.appendChild(el);
}

/**
 * Maneja el registro de usuario
 */
async function register(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm').value;
  
  if (password !== confirmPassword) {
    alert('Las contraseñas no coinciden');
    return;
  }
  
  const result = await API.registerUser(username, password);
  
  if (result.success) {
    authToken = result.data.token;
    currentUser = result.data.user;
    API.saveAuthToken(authToken);
    API.saveStoredUser(currentUser);
    updateAuthUI();
    // Cargar progreso del servidor o inicializar
    await loadProgress();
    renderGrid();
    updateStats();
  } else {
    alert(result.error || 'Error en el registro');
  }
}

/**
 * Maneja el login de usuario
 */
async function login(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  
  const result = await API.loginUser(username, password);
  
  if (result.success) {
    authToken = result.data.token;
    currentUser = result.data.user;
    API.saveAuthToken(authToken);
    API.saveStoredUser(currentUser);
    updateAuthUI();
    // Cargar progreso del servidor
    await loadProgress();
    renderGrid();
    updateStats();
  } else {
    alert(result.error || 'Credenciales inválidas');
  }
}

/**
 * Maneja el logout del usuario
 */
function logout() {
  currentUser = null;
  authToken = null;
  API.logoutUser();
  useLocalMode = true;
  updateAuthUI();
  // Cargar datos locales
  loadProgress();
  renderGrid();
  updateStats();
}

function renderGrid() {
  grid.innerHTML = '';
  for (let i = 1; i <= TOTAL; i++) {
    const el = document.createElement('div');
    const locked = i < todayDoy;
    applyState(el, i, locked);

    if (locked) {
      el.addEventListener('click', () => {
        clicks[i] = clicks[i] === 0 ? 1 : (clicks[i] % 3) + 1;
        applyState(el, i, true);
        save();
        updateStats();
      });
    } else {
      el.addEventListener('click', () => {
        clicks[i] = (clicks[i] + 1) % 4;
        applyState(el, i, false);
        save();
        updateStats();
      });
    }

    grid.appendChild(el);
  }
}

// Inicializar aplicación
loadProgress().then(() => {
  renderGrid();
  updateStats();
});

/* ── TAB SWITCHING & EVENT LISTENERS ── */
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  const tabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      if (tab.dataset.tab === 'login') {
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
      } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
      }
    });
  });
  
  // Form submissions
  loginForm.addEventListener('submit', login);
  registerForm.addEventListener('submit', register);
  
  // Logout button
  document.getElementById('logout-btn').addEventListener('click', logout);
});