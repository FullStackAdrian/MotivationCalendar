/**
 * A.5.5: pre-check fail-fast para suites que requieren Postgres.
 * Intenta una conexión corta (3s); si falla, imprime el hint accionable
 * y sale con código 1 en vez de dejar que cada test espere el acquire timeout.
 */
const { Client } = require('pg');

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/motivation_calendar_test';

const client = new Client({ connectionString, connectionTimeoutMillis: 3000 });

client
  .connect()
  .then(() => client.end())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\nNo se pudo conectar a Postgres (${error.message || error}).`);
    console.error('Postgres no disponible → npm run test:db:up (o `sh scripts/test-db-up.sh`)');
    process.exit(1);
  });
