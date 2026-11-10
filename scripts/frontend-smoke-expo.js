/**
 * Smoke test estático de la app Expo (sustituye al antiguo chequeo del web vanilla).
 * Valida el contrato mínimo que Consumption/CI necesita antes de `expo export`:
 * - app.json válido (slug, scheme, paquete Android, plugins expo-router/expo-secure-store)
 * - package.json con main expo-router/entry y scripts android/ios/web
 * - pantallas expo-router presentes (app/_layout + index/login/register/calendar/kanban/archive)
 * - sin referencias a hosts prohibidos (heroku; localhost/127.0.0.1 solo como
 *   fallback local junto a EXPO_PUBLIC_* / process.env)
 * - metro/babel coherentes con SDK 57
 */
const fs = require('node:fs');
const path = require('node:path');

const frontend = path.resolve(__dirname, '..', 'frontend');

function readJson(relative) {
  const full = path.join(frontend, relative);
  if (!fs.existsSync(full)) throw new Error(`Falta ${relative}`);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// 1. app.json
const appJson = readJson('app.json');
const expo = appJson.expo;
assert(expo && typeof expo === 'object', 'app.json debe declarar la clave "expo"');
assert(typeof expo.slug === 'string' && expo.slug.length > 0, 'app.json: falta expo.slug');
assert(typeof expo.scheme === 'string' && expo.scheme.length > 0, 'app.json: falta expo.scheme');
assert(Array.isArray(expo.plugins) && expo.plugins.includes('expo-router'), 'app.json: el plugin expo-router es obligatorio');
assert(expo.plugins.includes('expo-secure-store'), 'app.json: el plugin expo-secure-store es obligatorio');
assert(expo.android && typeof expo.android.package === 'string' && expo.android.package.length > 0, 'app.json: falta expo.android.package');
assert(expo.ios && typeof expo.ios.bundleIdentifier === 'string' && expo.ios.bundleIdentifier.length > 0, 'app.json: falta expo.ios.bundleIdentifier');

// 2. package.json del frontend
const pkg = readJson('package.json');
assert(pkg.main === 'expo-router/entry', `package.json: main debe ser "expo-router/entry" (es ${JSON.stringify(pkg.main)})`);
for (const script of ['android', 'ios', 'web']) {
  assert(pkg.scripts && typeof pkg.scripts[script] === 'string', `package.json: falta el script "${script}"`);
}
for (const dep of ['expo', 'expo-router', 'react', 'react-native']) {
  assert(pkg.dependencies && pkg.dependencies[dep], `package.json: falta la dependencia "${dep}"`);
}

// 3. Rutas expo-router
const routes = ['_layout.tsx', 'index.tsx', 'login.tsx', 'register.tsx', 'calendar.tsx', 'kanban.tsx', 'archive.tsx'];
for (const route of routes) {
  assert(fs.existsSync(path.join(frontend, 'app', route)), `Falta la ruta app/${route}`);
}

// 4. Hosts prohibidos: heroku nunca; localhost/127 solo como fallback local con EXPO_PUBLIC_*
const scanned = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist') walk(full);
    } else if (/\.(ts|tsx|js|json)$/.test(entry.name)) {
      scanned.push(full);
    }
  }
}
walk(path.join(frontend, 'app'));
walk(path.join(frontend, 'src'));
scanned.push(path.join(frontend, 'app.json'));

const violations = [];
for (const file of scanned) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (/heroku/i.test(line)) violations.push(`${path.relative(frontend, file)}:${index + 1}: referencia a Heroku`);
    if (/(localhost|127\.0\.0\.1)/.test(line) && !/(EXPO_PUBLIC_|process\.env)/.test(line)) {
      violations.push(`${path.relative(frontend, file)}:${index + 1}: host local sin EXPO_PUBLIC_*`);
    }
  });
}
assert(violations.length === 0, `Hosts prohibidos:\n${violations.join('\n')}`);

// 5. metro/babel coherentes con SDK 57
const metro = fs.readFileSync(path.join(frontend, 'metro.config.js'), 'utf8');
assert(/expo\/metro-config/.test(metro), 'metro.config.js debe usar expo/metro-config');
const babel = fs.readFileSync(path.join(frontend, 'babel.config.js'), 'utf8');
assert(/babel-preset-expo/.test(babel), 'babel.config.js debe usar babel-preset-expo');

console.log(`Expo smoke checks passed (${routes.length} rutas, ${scanned.length} ficheros escaneados).`);
