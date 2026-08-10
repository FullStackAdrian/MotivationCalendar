const fs = require('node:fs');

const COVERAGE_FILE = 'coverage.txt';
const MIN_LINES = 80;
const MIN_FUNCTIONS = 80;

if (!fs.existsSync(COVERAGE_FILE)) {
  console.error(`Coverage output not found: ${COVERAGE_FILE}`);
  process.exit(1);
}

const output = fs.readFileSync(COVERAGE_FILE, 'utf8');

// Node's native test coverage reporter prints a summary row like:
// All files | % Funcs | % Lines | ...
// We deliberately parse the generated report instead of relying on
// Node CLI flags that are not available in Node 20.
const lines = output.split(/\r?\n/);
const summary = lines.find((line) => /^All files\s*\|/i.test(line.trim()));

if (!summary) {
  console.error('Could not find the native Node coverage summary in coverage.txt.');
  console.error(output);
  process.exit(1);
}

const columns = summary.split('|').map((column) => column.trim());
const funcsIndex = columns.findIndex((column) => /%\s*Funcs/i.test(column));
const linesIndex = columns.findIndex((column) => /%\s*Lines/i.test(column));

if (funcsIndex === -1 || linesIndex === -1) {
  console.error(`Unexpected coverage summary format: ${summary}`);
  process.exit(1);
}

const funcs = Number.parseFloat(columns[funcsIndex]);
const lineCoverage = Number.parseFloat(columns[linesIndex]);

if (!Number.isFinite(funcs) || !Number.isFinite(lineCoverage)) {
  console.error(`Invalid coverage values: ${summary}`);
  process.exit(1);
}

console.log(`Backend coverage: functions=${funcs.toFixed(2)}% lines=${lineCoverage.toFixed(2)}%`);
console.log(`Required minimum: functions=${MIN_FUNCTIONS}% lines=${MIN_LINES}%`);

if (funcs < MIN_FUNCTIONS || lineCoverage < MIN_LINES) {
  console.error('Backend coverage threshold not met.');
  process.exit(1);
}

console.log('Backend coverage threshold passed.');
