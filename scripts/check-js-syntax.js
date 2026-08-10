const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const roots = ['backend', 'frontend', 'test', 'scripts'];
const files = [];

function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath);
    else if (entry.isFile() && filePath.endsWith('.js')) files.push(filePath);
  }
}

roots.forEach(walk);
let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr || `Syntax error: ${file}\n`);
  }
}
if (failed) process.exit(1);
console.log(`Syntax check passed for ${files.length} JavaScript files.`);
