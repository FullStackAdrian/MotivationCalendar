# TODO — Auditoría de testing, cobertura y limpieza

> Rama: `chore/testing-audit-and-expo-coverage`
> Objetivo: PR único (o PRs encadenados) que arregle la medición de cobertura, limpie/expanda los
> smoke tests, y añada tests + medición para la app **Expo (React Native)** antes de arrancar en Android.
>
> Auditoría realizada el 2026-11-10 sobre `master` (`d61b42b`).

---

## Contexto / hallazgos

### Estado actual
- **Backend**: 21 suites unitarias + 2 de integración (`test/integration/*.test.ts`) con Node test runner + `tsx`.
  Cobertura reportada (informe del **25-ago**, potencialmente desactualizado):
  **93.62% stmts · 81.51% branches · 93.11% funcs · 93.62% lines**.
- **Frontend Expo** (`frontend/`, Expo SDK 57 + React Native 0.86 + expo-router): Jest `jest-expo/universal`
  corre en 4 plataformas (Android/iOS/Node/Web) → **12 tests / 1 suite** (`__tests__/calendar-domain.test.ts`).
  **Sin medición de cobertura alguna** (sin `--coverage`, sin `coverageThreshold`).
- **CI** (`.github/workflows/ci.yml`): job `test` (lint → security-check → unit → integration →
  frontend smoke → coverage → `npm audit`) y job `frontend-expo` (typecheck → jest → `expo export --platform web`).

### Problemas detectados

1. **El smoke test del frontend no testea Expo**
   `npm run test:frontend` → `scripts/frontend-smoke.js` es un chequeo estático del **frontend web vanilla
   legado** (`frontend/index.html` + `frontend/assets/js/api-client.js`): verifica que no queden
   referencias a Heroku, que `window.APP_CONFIG.apiBaseUrl` se use y que los `src/href` locales existan.
   No valida nada del bundle Expo/Metro.
2. **Cobertura del frontend: 0% medida.** Ni Jest ni CI generan informe de cobertura del código RN.
3. **La cobertura no es reproducible localmente**: `test:coverage` incluye `test/integration/*.test.ts`,
   que necesita Postgres en `localhost:5432`, y el contenedor `motivation-calendar-postgres` **no publica
   el puerto al host** (solo `3000` y `8081` están mapeados). En CI sí existe (service container Postgres 16).
4. **Gates de cobertura débiles**: `c8 --lines 80 --functions 80` → **no se exigen branches ni statements,
   ni `--per-file`, ni `--all`**. Un archivo nuevo al 0% pasaría el gate si el global aguanta; un archivo
   nunca importado desaparece del informe en vez de bajar la cifra.
5. **Archivos con riesgo real infracubiertos** (ver tabla de prioridades más abajo).
6. **Trabajo duplicado en CI**: `npm test` ya ejecuta `test/*.test.ts test/integration/*.test.ts`; el paso
   "Integration tests" vuelve a correr los de integración.
7. **Deuda**: `frontend/assets/js/**`, `frontend/index.html` y `scripts/frontend-smoke.js` son el frontend
   web vanilla legado, ajeno a la app Expo.

---

## 📋 Resultados de la primera ejecución (2026-11-10, local, sin Postgres en 5432)

- **`npm test` (unit + integración): FALLA.**
  - `test/integration/*` → `ECONNREFUSED` en `localhost:5432` (previsto: contenedor sin puerto publicado).
  - `test/routes.auth.test.ts:31` → **`500 !== 401`**: sin BD el login devuelve 500 → **los "unit tests"
    no son herméticos** (ver A.5).
- **Suite unitaria en solitario (`test/*.test.ts`)**: 77/78 OK y **1 fallo** (el mismo de arriba);
  **no terminó en 10 minutos** → sin BD cada operación espera los 30s de `pool.acquire` (`database.ts:23`).
- **Conclusión:** la cobertura "93.62%" solo es válida en CI (con service container). Localmente hoy
  ni siquiera se puede ejecutar completa. Bloque A es, por tanto, lo primero.

---

## Bloque A — Entorno de tests (bloqueante para todo lo demás)

- [x] **A.1** Publicar el puerto 5432 de `motivation-calendar-postgres` en `docker-compose.yml`
      (o añadir un servicio/perfil `test` con `docker-compose.ci.yml` ya existente).
- [x] **A.2** Añadir script de conveniencia: `"test:db:up": "docker compose -f docker-compose.ci.yml up -d postgres"`
      y documentarlo en `Readme.md` / `README_POSTGRESQL.md` ("Cómo correr los tests localmente").
- [x] **A.3** Verificar que `.env.test` (o `test/helpers/test-env.ts`) fija `DATABASE_URL` y que
      `npm test` + `npm run test:coverage` pasan en local con la BD levantada.
- [x] **A.4** ~~Confirmar que el run en segundo plano falla/sucede como se prevee~~ → **HECHO (2026-11-10): falla, ver "Resultados de la primera ejecución" abajo.**

### A.5 — Hacer hermética la suite "unit" (nuevo)

- [x] **A.5.1** `test/routes.auth.test.ts` (etiquetado como unit) **dependía de Postgres real** → movido a
      `test/integration/auth.api.test.ts`. Igual para `sequelize.repositories`, `kanban.routes.errors`,
      `server.start` y la parte con BD de `database.models` (solo quedan en `test/` los 3 tests herméticos:
      esquema, validadores, campo inválido). Decisión: mover, no mockear (el composition root de
      `routes/auth.ts:13` instanciaría igual los casos de uso reales).
- [x] **A.5.2** Revisados `test/*.test.ts` por dependencia de BD (grep `sequelize|sync|initializeDatabase`):
      `progress.routes`, `server.behavior`, `server`, `coverage.edge` (salvo health-200), etc. son herméticos
      y se quedan. `coverage.edge` pasó a asertar CORS sobre ruta 404 (el health 200 con BD lo cubre
      `test/integration/api.test.ts`).
- [x] **A.5.3** Añadido **timeout de test runner** (`--test-timeout=10000` en `test:unit`,
      `30000` en `test`/`test:integration`/`test:coverage`).
- [x] **A.5.4** En `NODE_ENV=test`, `pool.acquire` 5000ms (overridable vía `TEST_ACQUIRE_TIMEOUT`) y
      `retry.max: 1` (`backend/infrastructure/models/database.ts`). Cubierto por `test/db-config.test.ts`.
- [x] **A.5.5** Hint accionable ante `ECONNREFUSED`/5432/timeout: `formatDatabaseError()` +
      `isDatabaseUnavailableError()` en `database.ts` (usado en `initializeDatabase`) y pre-check
      fail-fast `scripts/check-db.js` (solo `test:integration`/`test:coverage`, nunca `test:unit`).
      Cubierto por `test/db-error-hint.test.ts`.

> Estado cierre A.5 (2026-11-10, rama `chore/testing-a5-hermetic-units`): `test:unit` hermético 126/126
> en ~13s con `DATABASE_URL` a puerto cerrado; `test:integration` sin BD falla en ~0.3s con el hint;
> con BD `npm test` 156/156 y cobertura **99.36% stmts · 89.57% branches · 99.35% funcs** (gate per-file verde).
> CI añade job `unit-hermetic` (sin service Postgres, URL a puerto cerrado) como guard del criterio.

**Criterio de aceptación:** `npm test` sin BD termina en <1 min con fallos claros (no cuelgos);
con BD, `npm test` y `npm run test:coverage` en verde local.

---

## Bloque B — Corregir la medición de cobertura (backend)

- [x] **B.1** `package.json` → script `test:coverage`:
      añadir `--all --statements 80 --branches 75 --per-file` junto a los `--lines 80 --functions 80`
      actuales. Objetivo: que un archivo con lógica sin tocar **haga fallar** el gate.
- [x] **B.2** Añadir `.c8rc.json` (config declarativa) en vez de flags colgando del script:
      `include`, `exclude` (tipos: `**/*.d.ts`, `test/**`), `reporter: ["text", "text-summary", "lcov"]`,
      `all: true`, umbrales `lines/functions/statements: 80`, `branches: 75`.
- [x] **B.3** Excluir del cómputo los archivos **type-only** (`backend/application/ports/**`,
      `backend/domain/types.ts`, `backend/domain/repositories/**`) o confirmar que `--all` no los penaliza.
- [x] **B.4** Generar informe `lcov` y subirlo como artifact en CI (junto al `text` actual).
- [x] **B.5** Quitar la duplicación en `.github/workflows/ci.yml`: o bien `npm test` deja de incluir
      `test/integration/*` (script `test:unit`), o bien se elimina el paso "Integration tests".
- [x] **B.6** Regenerar `coverage/test-coverage.txt` actualizado (hoy es del 25-ago) y no commitearlo
      (añadir `coverage/` a `.gitignore` si sigue versionado).

**Criterio de aceptación:** CI falla si un archivo backend queda por debajo de los umbrales; informe fresco.

---

## Bloque C — Tests que faltan en backend (prioridad por riesgo)

| # | Archivo | Actual | Qué cubrir |
|---|---------|--------|------------|
| C.1 | `backend/server.ts` | 74.76% stmts | `startServer()` (líneas 82-98): **graceful shutdown SIGTERM/SIGINT + `closeDatabase()`**; arranque CLI (103-107) y su `catch`. Test con `PORT=0`, disparar señal, asertar cierre y `exit`. |
| C.2 | `backend/infrastructure/repositories/sequelize-*.ts` | 83.9% stmts / 73.9% branches | Ramas de error: `findByPk` → `null`, fallos de transacción, `catch` (hoy líneas 28-30, 31-37, 51-56, 72-80). Con Postgres real (A.1). |
| C.3 | `backend/infrastructure/models/database.ts` | 83.8% | `getUserByField` con campo fuera de la whitelist (seguridad), `findUserByIdentifier`/`findUserByEmail` → `null`, `initializeDatabase` (reintento) y `closeDatabase`. |
| C.4 | `backend/infrastructure/security/{token-provider,password-hasher}.ts` | 100% stmts / **73-75% branches** | JWT malformado, expirado, firma inválida, `alg` desconocido; bcrypt con hash corrupto/vacío. |
| C.5 | `backend/domain/services/kanban.service.ts` | 91.7% / 74.3% branches | Líneas 77, 93-98, 117-125: `addMember` (usuario inexistente / no owner), `createColumn` con `position` por defecto, `reorderColumn` con `targetPosition` inválido. |
| C.6 | `backend/domain/kanban.ts` | 100% / **67.4% branches** | Lógica pura sin BD (transiciones, WIP limits, límites de columnas): barato y rápido. |
| C.7 | `backend/application/schemas/*.ts` | 100% / 73% branches | Defaults/transformaciones de Zod y mensajes de validación. |
| C.8 | `backend/infrastructure/routes/kanban.ts` | 98.4% / 87.5% branches | Casos de error HTTP (403/404/400) no cubiertos. |

**Criterio de aceptación:** umbrales globales subidos (B.1) en verde con los branches ≥ 85%.

> Estado PR2: cumplido — global **99.4% stmts · 90.2% branches · 99.67% funcs · 99.4% lines**; gate per-file verde (`branches: 70`, ver `.c8rc.json` + nota en `Readme.md` sobre el techo 71-73% por artefactos V8/`__toESM` en ficheros hoja).

---

## Bloque D — Limpiar y ampliar los smoke tests

- [x] **D.1** **Limpiar el smoke test legado** (Opción 1): eliminado `frontend/index.html`,
      `frontend/assets/js/**` (18 ficheros) y `scripts/frontend-smoke.js`. `test:frontend` se **conserva**
      como nombre pero apunta al smoke Expo (D.2), así que el paso de CI y la docs siguen valiendo.
- [x] **D.2** Nuevo `scripts/frontend-smoke-expo.js`: valida `app.json`, `main`+scripts+deps,
      las 7 rutas, hosts prohibidos (`localhost` solo junto a `EXPO_PUBLIC_*`) y metro/babel SDK 57.
- [x] **D.3** `npm run export:web` verificado en local (EXIT:0, `dist/` con 7 rutas + `_expo/`).
- [x] **D.4** Backend 100% API-only: eliminado el estático + fallback de `backend/server.ts`;
      integración y edge tests asertan `GET /api/health` 200 y rutas desconocidas 404. `deploy-pages.yml`
      y `docker.yml` migrados al export Expo / health+404.

**Criterio de aceptación:** `npm run lint` no referencia a nada eliminado; CI verde en los 2 jobs.

---

## Bloque E — Tests y medición para el frontend Expo (hoy 0% medido)

- [x] **E.1** Cobertura en `frontend/package.json`: `test:coverage` (`--coverage --coverageProvider=v8`)
      + `coverageThreshold` exigente `global: { statements: 70, branches: 70, functions: 75, lines: 70 }`
      y `collectCoverageFrom`: `src/**`, `app/**` (medido: 70.8/75.7/77.4).
- [x] **E.2** CI (`frontend-expo`): `npm run test:coverage` + artifact `frontend-coverage`.
- [x] **E.3** Dominio ampliado (`calendar-domain`: bisiestos, `partial`/`miss`).
- [x] **E.4** `auth-context` (hydrate/login/register/logout, expiración, token anónimo/malformado, fuera de provider)
      + `token-storage` (SecureStore vs localStorage). Nota: no hay refresh en el código actual; se testea
      expiración vía `exp` en su lugar.
- [x] **E.5** `use-responsive` (mobile/tablet/desktop, bordes sm/md/lg, compact). Solo nativo (ver nota E.6).
- [x] **E.6** RTL: `components` (botones, Field, Badge, header, Icon), pantallas `login/register` (validación,
      errores, navegación), `calendar` (stats, error, ciclo de estados, pasado bloqueado), `kanban` (crear
      pizarra/columna/tarea, mover tarjeta, errores, logout), `archive` (vacío, lista, error, cambio de board),
      rutas `app/` (re-exports, Redirect según sesión, layout). **Nota de alcance**: `jest-expo/universal`
      ejecuta en 4 proyectos pero web/node no soportan UI (queries/eventos tocan el puente nativo):
      los tests UI solo corren en android/ios (`__tests__/helpers/projects.ts`); la cobertura fusionada
      los cubre igual.
- [x] **E.7** `api-client`: `defaultBaseUrl()` (`EXPO_PUBLIC_API_URL`, `10.0.2.2` en Android) + 401 → `clearAuth`.
      Repos `calendar`/`kanban` mapean endpoints.
- [x] **E.8** `axios` mockeado por fichero (instancia `__instance`); cero red en UI.

**Criterio de aceptación:** cobertura Expo medida en CI (70/70/75/70, real 70.8/75.7/77.4); ≥1 test por pantalla. ✅

---

## Bloque F — Limpieza de deuda relacionada

- [x] **F.1** `test:frontend` se **conserva** a propósito: tras D.2 valida la app Expo (no el legacy),
      así que el paso de CI y su nombre siguen teniendo sentido.
- [x] **F.2** `security-check.js` y `check-js-syntax.js` no referencian `frontend/assets/js` (verificado por grep);
      sin cambios necesarios.
- [x] **F.3** Tabla de estrategia de tests en `ARCHITECTURE.md` (sustituye ejemplos obsoletos del vanilla).
- [x] **F.4** `DEPLOYMENT_GUIDE.md` eliminado (describía el deploy del vanilla a Pages; sustituido por el export
      Expo en `deploy-pages.yml`).

---

## Orden sugerido de ejecución (PRs)

1. **PR 1 — Bloque A + B**: entorno DB + gate de cobertura real + limpieza de CI. *( pequeño, desbloquea todo)*
2. **PR 2 — Bloque C**: tests backend que faltan (shutdown, repos, seguridad, dominio).
3. **PR 3 — Bloque D**: limpieza/ampliación de smoke tests + retirada del web vanilla legado.
4. **PR 4 — Bloque E + F**: medición y tests del frontend Expo.

## Referencias de los números actuales (para comparar tras cada PR)

```
All files                            |   93.62 |    81.51 |   93.11 |   93.62
 backend (server.ts)                 |   74.76 |    80.64 |      80 |   74.76
 backend/domain (kanban.ts)          |     100 |    67.39 |     100 |     100
 backend/infrastructure/repositories |    83.9 |    80.72 |   86.44 |    83.9
 backend/infrastructure/security     |     100 |    74.19 |     100 |     100
 frontend Expo (Jest)                |   SIN MEDIR — 12 tests / 1 suite
```

---

# BETA — Endurecimiento para beta en producción (auditoría 2026-11-10)

> Auditoría runtime real: backend `master` + Postgres local + stack Docker
> (`motivation-calendar-backend:3000`, `frontend:8081`) + Playwright contra la
> app servida. Cada bloque = **1 rama + 1 PR separada**. No duplican
> `TODO_DEPLOY.md` (P.1–P.6): lo referencian donde solapan.
> Tras BETA-1…BETA-4 la app queda en estado beta; BETA-5 es checklist de salida.

## BETA-1 — Seguridad y robustez API (`chore/beta-1-api-hardening`)

Evidencia: `POST /api/auth/login` x21 seguidos → 21×`401`, ningún `429`
(`backend/infrastructure/routes/auth.ts:15-17` sin rate-limit; grep
`helmet|rate-limit` en `server.ts`/`package.json` = 0). Headers en
`GET /api/health`: solo `nosniff/DENY/Referrer-Policy`, sin HSTS/CSP.
`GET /nope` y `GET /api/kanban/auth` devuelven **HTML** de Express
(`Cannot GET …`), no JSON. `GET /api/kanban/boards/:id` inexistente → `500`
(debería 404/403); el middleware de `kanban.ts:56-60` no mapea
`'Estado no encontrado'` (`kanban.service.ts:getBoard`) y cae al handler
genérico. `/api/health` expone `environment`; con `NODE_ENV=development`
(Docker local) el handler CORS devuelve el mensaje interno.

- [ ] **B1.1** Rate-limit en `POST /api/auth/register` y `/login`
      (`express-rate-limit`, p. ej. 10/15min por IP; `trust proxy` si hay
      nginx delante). Test del `429`. (Solapa con P.3.)
- [ ] **B1.2** 404 JSON API-only: catch-all tras las rutas que devuelva
      `{ error: 'No encontrado' }` en vez del HTML de Express. Test.
- [ ] **B1.3** Mapear `'Estado no encontrado'` → 404 en `kanban.ts:56-60`
      (o mensaje `'Tablero no encontrado'` que case con la regex). Test:
      `GET boards/:id` inexistente → 404, no 500.
- [ ] **B1.4** Headers: añadir HSTS (solo prod/tras TLS) + CSP básica o
      documentar por qué no aplican al API-only; mantener `x-powered-by`
      desactivado. Test de headers.
- [ ] **B1.5** Sanitizar errores: ningún `err.message` interno ni `stack`
      fuera de `development` (revisar `server.ts:67-73`,
      `auth.controller.ts:83-92`); `/api/health` sin `environment` en
      respuesta (o campo mínimo `status/database`).

**Aceptación:** 11º login seguido → `429`; rutas desconocidas JSON 404;
tablero inexistente → 404; `npm test` + `test:coverage` verdes.

## BETA-2 — Validación de Kanban (`chore/beta-2-kanban-validation`)

Evidencia: `POST /api/kanban/boards {"name":"<script>alert(1)</script>"}`
→ `201` con el nombre guardado tal cual (sin `maxlength`; `normalizeName`
en `backend/domain/kanban.ts:13-15` solo exige no-vacío). Mismo endpoint
con `name` de 5000 chars → `500 Error interno` (debería 400). Login con
`identifier: "admin OR 1=1 --"` → `401` correcto (Sequelize parametriza;
sin inyección). Registro duplicado → `409` correcto.

- [ ] **B2.1** `maxLength` en nombres/descripciones de board/column/task
      (p. ej. name ≤ 120, description ≤ 2000) en `domain/kanban.ts` con
      mensajes 400; verificar que el 5k da 400, no 500.
- [ ] **B2.2** Política XSS documentada + test: RN `<Text>` y `react-dom`
      escapan por defecto (bajo riesgo), pero el backend no debe persistir
      `<script>` sin necesidad — o bien sanitizar/escapar al presentar, o
      documentar "almacenar literal, escapar al render" con test de render.
- [ ] **B2.3** Revisar resto de `create*`/`update*` de kanban con el mismo
      patrón (límites + códigos 400/403/404) y tests de cada 500 hallado.

**Aceptación:** nombre 5k → 400; `<script>` con comportamiento definido y
testeado; ningún `create*` devuelve 500 por entrada larga/vacía.

## BETA-3 — Expo: guards de auth y UX de error (`chore/beta-3-expo-auth-guards`)

Evidencia Playwright (Docker `frontend:8081`): `GET /calendar` y `/kanban`
**sin sesión** renderizan el shell con error inline
(`No se proporcionó token de autenticación`) y **sin redirect a `/login`**
(solo `app/index.tsx` redirige; `app/calendar.tsx|kanban.tsx|archive.tsx`
sin `useAuth/Redirect` — grep vacío; `_layout.tsx` sin guard).
Falta `favicon.ico` → 404 en consola. Hydration web: `Minified React
error #418` en consola tras el login 403. Token expirado real (firmado)
→ `401 Token expirado` correcto en API, pero la app solo limpia el token
en 401 sin redirigir ni avisar. Botón deshabilitado con campos vacíos OK;
credenciales malas muestran `Credenciales inválidas` OK (vía localhost).

- [ ] **B3.1** Guard en rutas protegidas (`calendar/kanban/archive` o
      layout segment): si `!loading && !user` → `Redirect /login`.
      Tests RTL + smoke Playwright manual.
- [ ] **B3.2** Sesión expirada: 401/expiración → `clearAuth` + redirect
      `/login` + mensaje ("Sesión expirada"), no solo error inline.
- [ ] **B3.3** No mostrar strings internos de red en UI: mapear
      `No permitido por CORS`/mensajes técnicos a texto genérico
      ("No se pudo conectar…"). (El 403 CORS solo debe verse en dev.)
- [ ] **B3.4** `favicon.ico` + assets web base; investigar el #418 de
      hidratación en `expo export --platform web` (repro: login con API
      403) y documentar o corregir.
- [ ] **B3.5** Resiliencia `ApiClient`: timeout ya 10s; añadir 1 reintento
      en GETs idempotentes + estado offline/vacio en calendar/kanban
      (hoy solo error inline). Tests.

**Aceptación:** `/calendar` y `/kanban` sin sesión → `/login`; sesión
expirada → `/login` con aviso; consola sin 404 favicon ni #418 en flujo feliz.

## BETA-4 — Web/CORS/despliegue (`chore/beta-4-web-cors-deploy`)

Evidencia: abrir la misma app en `http://127.0.0.1:8081/login` → login
siempre `403 No permitido por CORS`; en `http://localhost:8081/login` →
`401 Credenciales inválidas` correcto. Causa:
`ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081`
(`docker-compose.yml:35`) sin variantes `127.0.0.1`. Además:
`deploy.yml:27`/`deploy-pages.yml:78` empaquetan `backend/` en `.ts` sin
`npm run build` (artefacto no arranca con `node backend/dist/server.js`,
P.1); `deploy-pages.yml:49-51` exporta sin `EXPO_PUBLIC_API_URL` (hornea
`localhost:3000`, P.2); Node `20` en backend/deploy frente a `22` en CI y
frontend (P.5).

- [ ] **B4.1** `ALLOWED_ORIGINS` dev: incluir `http://localhost:8081`,
      `http://127.0.0.1:8081`, `http://localhost:3000`,
      `http://127.0.0.1:3000` (o variable documentada en `.env.example`).
      Test: login vía `127.0.0.1` en verde.
- [ ] **B4.2** `deploy.yml` + `deploy-pages.yml` (job `backend-artifact`):
      `setup-node` + `npm ci` + `npm run build`, empaquetar `dist/`. (P.1.)
- [ ] **B4.3** `deploy-pages.yml`: inyectar `EXPO_PUBLIC_API_URL` desde
      secret + validación `! grep localhost dist/index.html`. (P.2.)
- [ ] **B4.4** Alinear Node a 22 (backend Dockerfile + deploys) y verificar
      `docker.yml` en CI. (P.5.)

**Aceptación:** login OK en `localhost` y `127.0.0.1`; artefacto backend
descargado arranca; export Pages sin `localhost:3000`; CI+Doker verdes.

## BETA-5 — Checklist de salida beta (`chore/beta-5-beta-checklist`)

> Hecho 2026-11-11: lint OK, unit 126/126, integración 32/32 (incl. seeder), backend cobertura 99.4/89.6/99.4 gate verde, Expo coverage exit 0, typecheck OK, smoke OK, audit high exit 0. E2E happy path (register → calendar → kanban + crear pizarra) verde; único error de consola el #418 documentado. P.6: sin refresh rotation en la beta (documentado en Readme).

Evidencia: `npm audit --audit-level=high` → pasa con **6 moderate**
restantes; `test:unit` 126/126 verde; seguridad: `JWT_SECRET` mínimo 32 en
prod OK, bcrypt cost 10 OK, `sync()` create-only OK, `.env` no versionado
OK. Quedan decisiones/documentación, no bloqueantes de código.

- [x] **B5.1** `Readme.md`: sección "Beta" (qué incluye/no incluye,
      cómo desplegar, variables requeridas, límites conocidos:
      sin refresh-token, JWT 30d).
- [x] **B5.2** Runbook mínimo: backup/restore Postgres del volumen,
      rotación `JWT_SECRET`, lectura de logs, healthcheck.
- [x] **B5.3** Decidir P.6 (refresh rotation) como scope aparte sí/no;
      si no, dejarlo fuera de la beta por escrito.
- [x] **B5.4** Seeder demo idempotente solo staging tras flag (P.4, opcional
      para beta si hace falta demo).
- [x] **B5.5** Puerta final: `lint` + `test:unit` + `test:integration` +
      `test:frontend` + `test:coverage` + `audit --audit-level=high` +
      flujo Playwright feliz (register→login→calendar→kanban) sin errores
      de consola salvo favicon ya corregido.

**Aceptación:** checklist B5.5 en verde y documentado en el README;
sin bloqueantes BETA-1…BETA-4 abiertos.

## Orden de PRs (cada una de su rama)

1. **BETA-1** (seguridad API) — primera, bloquea la beta.
2. **BETA-2** (validación kanban) — independiente, puede ir en paralelo.
3. **BETA-3** (guards/UX Expo).
4. **BETA-4** (CORS/deploy) — incluye P.1+P.2+P.5.
5. **BETA-5** (checklist/docs) — última, solo cuando 1–4 estén verdes.
