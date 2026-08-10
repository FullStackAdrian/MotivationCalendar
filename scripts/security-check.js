const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const trackedEnvFiles = tracked.filter((file) => /(^|\/)\.env(?:\.|$)/.test(file));
const forbiddenEnvFiles = trackedEnvFiles.filter((file) => !/\.example$/.test(file));
if (forbiddenEnvFiles.length > 0) {
  throw new Error(`Environment files containing local secrets must not be tracked: ${forbiddenEnvFiles.join(', ')}`);
}

const candidates = tracked.filter((file) => /\.(js|json|yml|yaml)$/.test(file));
const suspicious = [];
for (const file of candidates) {
  const content = fs.readFileSync(file, 'utf8');
  if (/JWT_SECRET\s*[:=]\s*["'][^"']{12,}["']/.test(content) && !/process\.env\.JWT_SECRET/.test(content)) {
    suspicious.push(file);
  }
}

if (suspicious.length > 0) {
  throw new Error(`Possible hard-coded JWT secret found in: ${suspicious.join(', ')}`);
}

console.log('Security configuration checks passed: no tracked secret env files or obvious hard-coded JWT secrets.');
