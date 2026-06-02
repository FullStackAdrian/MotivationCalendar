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

/* ── PERSISTENCE ── */
let clicks;
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  clicks = saved ? JSON.parse(saved) : new Array(TOTAL + 1).fill(0);
  if (!Array.isArray(clicks) || clicks.length !== TOTAL + 1) {
    clicks = new Array(TOTAL + 1).fill(0);
  }
} catch (e) {
  clicks = new Array(TOTAL + 1).fill(0);
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(clicks)); } catch (e) {}
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

updateStats();