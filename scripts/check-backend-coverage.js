const fs = require('fs');

const reportPath = process.argv[2] || 'coverage.txt';
const minimum = 80;

if (!fs.existsSync(reportPath)) {
  console.error(`Coverage report not found: ${reportPath}`);
  process.exit(1);
}

const lines = fs.readFileSync(reportPath, 'utf8').split(/\r?\n/);
const backendRows = [];

for (const line of lines) {
  if (!line.includes('|') || line.includes('all files') || line.includes('file      |')) continue;
  const columns = line.split('|').map((value) => value.trim());
  if (columns.length < 4) continue;

  const file = columns[0];
  const lineCoverage = Number.parseFloat(columns[1]);
  const functionCoverage = Number.parseFloat(columns[3]);

  if (file.startsWith('backend/') && Number.isFinite(lineCoverage) && Number.isFinite(functionCoverage)) {
    backendRows.push({ file, lineCoverage, functionCoverage });
  }
}

if (backendRows.length === 0) {
  console.error('No backend files were found in the Node test coverage report.');
  process.exit(1);
}

const total = backendRows.reduce((acc, row) => ({
  lines: acc.lines + row.lineCoverage,
  functions: acc.functions + row.functionCoverage,
  count: acc.count + 1
}), { lines: 0, functions: 0, count: 0 });

// Node's text report exposes percentages per file. The CI gate uses the
// arithmetic mean of backend file percentages, avoiding test files and scripts.
const linesCoverage = total.lines / total.count;
const functionsCoverage = total.functions / total.count;

console.log(`Backend coverage: lines ${linesCoverage.toFixed(2)}%, functions ${functionsCoverage.toFixed(2)}%`);

if (linesCoverage < minimum || functionsCoverage < minimum) {
  console.error(`Backend coverage must be at least ${minimum}% for lines and functions.`);
  for (const row of backendRows.filter((entry) => entry.lineCoverage < minimum || entry.functionCoverage < minimum)) {
    console.error(`  ${row.file}: lines ${row.lineCoverage.toFixed(2)}%, functions ${row.functionCoverage.toFixed(2)}%`);
  }
  process.exit(1);
}

console.log(`Backend coverage gate passed (>= ${minimum}% lines and functions).`);
