const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const envFiles = tracked.filter((file) => /(^|\/)\.env$|\.env\.[^.]+$/.test(file) && file !== '.env.example');
if (envFiles.length > 0) {
  throw new Error(`Environment files must not be tracked: ${envFiles.join(', ')}`);
}

const candidates = tracked.filter((file) => /\.(js|json|yml|yaml|md|html|css)$/.test(file));
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

console.log('Security configuration checks passed: no tracked .env files or obvious hard-coded JWT secrets.');
