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
npm test
npm run test:integration
npm run test:frontend
npm run test:coverage
npm audit --audit-level=high
```

`test/integration/api.test.js` exercises the HTTP API against PostgreSQL, including registration, duplicate conflicts, login, authentication failures, user isolation, single-day updates, bulk updates, persistence after reconnecting to the database, and deletion.

Coverage output is uploaded by GitHub Actions as the `test-coverage` artifact. The initial pipeline deliberately reports coverage rather than imposing an artificial 100% threshold; a backend-critical threshold can be introduced once the baseline is established.

## Project Structure

```text
motivation-calendar/
├── backend/
├── frontend/
├── scripts/
│   ├── check-js-syntax.js
│   ├── frontend-smoke.js
│   └── security-check.js
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
5. Frontend static smoke tests
6. Test coverage and artifact upload
7. `npm audit --audit-level=high`

The workflow uses minimal `contents: read` permissions.

### Docker

The Docker workflow builds and inspects the backend image, starts the PostgreSQL + backend compose stack, waits for `/api/health`, and performs frontend smoke checks through the packaged backend.

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
