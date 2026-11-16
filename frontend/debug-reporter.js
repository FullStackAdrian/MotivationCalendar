/**
 * TEMPORAL para diagnosticar el fallo TDD en CI (ver anotaciones públicas).
 * No altera la ejecución de los tests; solo vuelca los fallos a un fichero.
 */
const fs = require('node:fs');

class DebugReporter {
  onRunComplete(_contexts, results) {
    const lines = [];
    for (const f of results.testResults || []) {
      if (f.status === 'failed') {
        lines.push(`SUITE FAILED: ${f.testFilePath}`);
        if (f.message) lines.push(String(f.message).slice(0, 1500));
      }
      for (const a of f.testResults || []) {
        if (a.status === 'failed') {
          lines.push(`TEST FAILED: ${f.testFilePath} :: ${a.fullName}`);
          lines.push((a.failureMessages || []).join('\n').slice(0, 1500));
        }
      }
    }
    if (results.numTotalTests === 0) lines.push('NO TESTS RAN AT ALL');
    fs.writeFileSync(
      '/tmp/jest-failures.txt',
      lines.length > 0 ? lines.join('\n---\n') : 'NO_FAILURES_BUT_EXIT_NONZERO',
    );
  }
}

module.exports = DebugReporter;
