# 🗓️ Motivation Calendar

> A minimalist, interactive 365-day canvas to map and color-code your entire year.

## Overview

Motivation Calendar is a simple web application that helps you visualize your year at a glance. Track your daily progress, habits, and goals using an intuitive color-coding system.

## Features

### Core Features
- **📅 365-Day Canvas**: Interactive calendar view of the entire year
- **🎨 Color-Coded System**: Statuses for completed, partial and failed days
- **✨ Minimalist Design**: Clean, distraction-free interface

### Authentication & Sync
- **🔐 JWT Authentication** with bcrypt password hashing
- **💾 PostgreSQL persistence** through Sequelize
- **🔄 Auto-Save** and bulk progress synchronization
- **☁️ Cross-device Sync** through the authenticated API

## Getting Started

### Option A — Docker Compose (recommended)

Docker is the easiest way to start the complete local stack because it provides PostgreSQL and the backend together.

```bash
cp .env.docker.example .env
docker compose up --build
```

Then open `http://localhost:3000`.

The first startup may take a little longer while the image is built and PostgreSQL initializes. The backend waits for PostgreSQL's health check before starting.

Useful commands:

```bash
# Follow logs
docker compose logs -f

# Stop containers while keeping database data
docker compose down

# Stop containers and delete the local database volume
docker compose down -v

# Rebuild after Dockerfile/dependency changes
docker compose up --build
```

The local database is persisted in the `motivation-calendar-postgres-data` Docker volume. The default credentials and JWT secret in `.env.docker.example` are development-only values and must never be used in production.

### Option B — Native Node.js

#### Prerequisites
- Node.js 20 for CI parity
- PostgreSQL 16 for integration tests and local backend development
- npm

#### Installation

```bash
npm ci
cp .env.example .env
```

Set `JWT_SECRET`, `NODE_ENV`, `DATABASE_URL`/database variables and `ALLOWED_ORIGINS` in `.env`, then start the server:

```bash
npm start
```

Open `http://localhost:3000` in your browser.

## Tests and quality checks

The repository intentionally does not use `npm test` as its only CI criterion. The CI pipeline runs Node 20, a real PostgreSQL 16 service, static frontend checks, integration tests, coverage and security auditing.

```bash
npm run lint
npm run test:unit
npm run test:integration
npm run test:frontend
npm run test:coverage
npm audit --audit-level=high
```

`npm test` corre unitarias + integración juntas (útil en local con la BD levantada).
En CI se separan en `test:unit` + `test:integration` para evitar la duplicación.

### Cómo correr los tests localmente (Postgres)

```bash
# Levanta Postgres para tests (docker-compose.yml con puerto mapeado al host)
# y crea la BD motivation_calendar_test si no existe.
npm run test:db:up

npm test              # unitarias + integración
npm run test:unit     # solo unitarias
npm run test:integration  # solo integración (necesita Postgres)
npm run test:coverage # gates en .c8rc.json + informe en coverage/
```

`test/helpers/test-env.ts` fija `DATABASE_URL` por defecto a
`postgres://postgres:postgres@localhost:5432/motivation_calendar_test` si no hay
`DATABASE_URL` en el entorno. Si tu 5432 está ocupado, pon `POSTGRES_PORT=5433`
en tu `.env` (ver `.env.example`) y exporta un `DATABASE_URL` acorde.

`test/integration/api.test.js` exercises the HTTP API against PostgreSQL, including registration, duplicate conflicts, login, authentication failures, user isolation, single-day updates, bulk updates, persistence after reconnecting to the database, and deletion.

Coverage output is uploaded by GitHub Actions as the `test-coverage` artifact (`coverage/` con `test-coverage.txt` + `lcov.info`). Los gates están en `.c8rc.json` (`lines/functions/statements: 80`, `branches: 70`, `all: true`, `perFile: true`; global real: ~99/90/100/99): un archivo backend sin cubrir hace fallar el gate aunque el global aguante. El umbral de branches es 70 y no 75 porque V8 cuenta brazos del interop CJS (`__toESM`) en el preámbulo de los ficheros hoja sin lógica (schemas, token-provider: 100% líneas/funcs, ramas 71-73% inalcanzables).

## Project Structure

```text
motivation-calendar/
├── backend/
├── frontend/
├── scripts/
│   ├── check-js-syntax.js
│   ├── frontend-smoke-expo.js
│   ├── security-check.js
│   └── test-db-up.sh
├── test/integration/
├── .github/workflows/
│   ├── ci.yml
│   ├── deploy.yml
│   └── docker.yml
├── docker-compose.yml
├── docker-compose.ci.yml
├── .env.example
├── .env.docker.example
├── package.json
└── Readme.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Progress
- `GET /api/progress` - Get user's progress
- `PUT /api/progress/:dayKey` - Update a specific day (YYYY-MM-DD)
- `POST /api/progress/bulk` - Update multiple days at once
- `DELETE /api/progress` - Delete the authenticated user's progress

### Health Check
- `GET /api/health` - Server health status

## GitHub Actions

### CI

Pull requests and pushes to `master` run:

1. Node 20 setup and `npm ci`
2. JavaScript syntax/lint checks
3. Unit tests
4. PostgreSQL-backed HTTP integration tests
5. Expo static smoke tests (`scripts/frontend-smoke-expo.js`: app.json, rutas, sin hosts prohibidos)
6. Test coverage and artifact upload
7. `npm audit --audit-level=high`

The workflow uses minimal `contents: read` permissions.

### Docker

The Docker workflow builds and inspects the backend image, starts the PostgreSQL + backend compose stack, waits for `/api/health`, and asserts the API-only backend answers 404 on `/`.

### Deployment

Deployment is intentionally separate from CI. A successful CI run on `master` triggers the GitHub Pages frontend deployment and creates the backend tarball artifact. The backend is **not** claimed to be deployed to a hosting provider until one is configured.

## Security Notes

- Never commit `.env` or real secrets.
- Use a strong random `JWT_SECRET` in production.
- Set `ALLOWED_ORIGINS` to the actual production origins.
- Use HTTPS in production.
- Consider rate limiting before exposing the API publicly.

## License

ISC
