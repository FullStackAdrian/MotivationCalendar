const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'frontend');
const indexPath = path.join(root, 'index.html');
const apiClientPath = path.join(root, 'assets', 'js', 'api-client.js');

if (!fs.existsSync(indexPath)) throw new Error('frontend/index.html is missing');
if (!fs.existsSync(apiClientPath)) throw new Error('frontend/assets/js/api-client.js is missing');

const index = fs.readFileSync(indexPath, 'utf8');
const apiClient = fs.readFileSync(apiClientPath, 'utf8');

if (/herokuapp\.com|heroku\.com/i.test(index + apiClient)) {
  throw new Error('Frontend still contains a reference to Heroku');
}
if (!/window\.APP_CONFIG\?\.apiBaseUrl/.test(apiClient)) {
  throw new Error('api-client.js does not use window.APP_CONFIG.apiBaseUrl');
}

const references = [...index.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map((match) => match[1])
  .filter((reference) => !reference.startsWith('http://') && !reference.startsWith('https://') && !reference.startsWith('#'));

for (const reference of references) {
  const resolved = path.resolve(path.dirname(indexPath), reference);
  if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) {
    throw new Error(`Broken frontend asset reference: ${reference}`);
  }
}

console.log(`Frontend smoke checks passed (${references.length} local references).`);
