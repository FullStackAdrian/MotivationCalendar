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

## Bloque A — Entorno de tests (bloqueante para todo lo demás)

- [ ] **A.1** Publicar el puerto 5432 de `motivation-calendar-postgres` en `docker-compose.yml`
      (o añadir un servicio/perfil `test` con `docker-compose.ci.yml` ya existente).
- [ ] **A.2** Añadir script de conveniencia: `"test:db:up": "docker compose -f docker-compose.ci.yml up -d postgres"`
      y documentarlo en `Readme.md` / `README_POSTGRESQL.md` ("Cómo correr los tests localmente").
- [ ] **A.3** Verificar que `.env.test` (o `test/helpers/test-env.ts`) fija `DATABASE_URL` y que
      `npm test` + `npm run test:coverage` pasan en local con la BD levantada.
- [ ] **A.4** Confirmar que el run en segundo plano falla/sucede como se prevee y dejarlo verde.

**Criterio de aceptación:** `npm test` y `npm run test:coverage` en verde en local sin tocar nada más.

---

## Bloque B — Corregir la medición de cobertura (backend)

- [ ] **B.1** `package.json` → script `test:coverage`:
      añadir `--all --statements 80 --branches 75 --per-file` junto a los `--lines 80 --functions 80`
      actuales. Objetivo: que un archivo con lógica sin tocar **haga fallar** el gate.
- [ ] **B.2** Añadir `.c8rc.json` (config declarativa) en vez de flags colgando del script:
      `include`, `exclude` (tipos: `**/*.d.ts`, `test/**`), `reporter: ["text", "text-summary", "lcov"]`,
      `all: true`, umbrales `lines/functions/statements: 80`, `branches: 75`.
- [ ] **B.3** Excluir del cómputo los archivos **type-only** (`backend/application/ports/**`,
      `backend/domain/types.ts`, `backend/domain/repositories/**`) o confirmar que `--all` no los penaliza.
- [ ] **B.4** Generar informe `lcov` y subirlo como artifact en CI (junto al `text` actual).
- [ ] **B.5** Quitar la duplicación en `.github/workflows/ci.yml`: o bien `npm test` deja de incluir
      `test/integration/*` (script `test:unit`), o bien se elimina el paso "Integration tests".
- [ ] **B.6** Regenerar `coverage/test-coverage.txt` actualizado (hoy es del 25-ago) y no commitearlo
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

---

## Bloque D — Limpiar y ampliar los smoke tests

- [ ] **D.1** **Limpiar el smoke test legado**: `scripts/frontend-smoke.js` solo debe validar el frontend
      que de verdad se despliega. Decidir destino del web vanilla:
  - **Opción 1 (recomendada)**: eliminar `frontend/index.html`, `frontend/assets/js/**` y
    `scripts/frontend-smoke.js`, y borrar los pasos `test:frontend` de `package.json` y `ci.yml`.
  - **Opción 2**: si el web vanilla sigue vivo, moverlo a `frontend-legacy/` con su propio smoke.
- [ ] **D.2** **Ampliar el smoke test real** a nivel de app Expo, sustituyendo lo anterior:
  - nuevo `scripts/frontend-smoke-expo.js` o, mejor, test Jest:
    - `app.json` válido (slug, scheme, `android.package`, plugins `expo-router`/`expo-secure-store`);
    - `package.json` → `main: "expo-router/entry"` y scripts `android/ios/web` presentes;
    - presencia de `app/_layout.tsx` + pantallas `index/login/register/calendar/kanban/archive`;
    - **sin referencias a hosts prohibidos** (heroku, `localhost` hardcodeado → usar `EXPO_PUBLIC_*`/config);
    - banderas de `metro.config.js` / `babel.config.js` coherentes con SDK 57.
- [ ] **D.3** Verificar que `npm run export:web` (job `frontend-expo` de CI) sigue pasando tras el cambio.
- [ ] **D.4** Asegurar que el **health check** `GET /api/health` y el fallback estático de
      `backend/server.ts` (líneas 62-66) quedan cubiertos por tests de integración si desaparece el
      `index.html` legado (ajustar o eliminar esa ruta si el frontend ya es 100% Expo).

**Criterio de aceptación:** `npm run lint` no referencia a nada eliminado; CI verde en los 2 jobs.

---

## Bloque E — Tests y medición para el frontend Expo (hoy 0% medido)

- [ ] **E.1** Activar cobertura en `frontend/package.json`:
      `test:coverage`: `jest --coverage --coverageProvider=v8` + bloque `coverageThreshold`
      (inicial humilde: `global: { statements: 50, branches: 40, functions: 50, lines: 50 }`)
      y `collectCoverageFrom`: `src/**/*.{ts,tsx}`, `app/**/*.{ts,tsx}`, excluyendo `_layout` si hace falta.
- [ ] **E.2** Paso en CI (job `frontend-expo`): `npm run test:coverage` + `actions/upload-artifact` con
      `frontend/coverage/`.
- [ ] **E.3** Tests de **lógica** ya existente sin RN: ampliar `frontend/__tests__/` con el resto de
      `src/domain/**` (puro, corre en los 4 proyectos de `jest-expo/universal`).
- [ ] **E.4** Tests de **estado/contexto**: `src/contexts/auth-context.tsx` — login/logout, persistencia
      del JWT con `expo-secure-store` (mock del módulo), refresh/decodificación con `jwt-decode`,
      expiración de token. *(Es lo que más se romperá al arrancar en Android.)*
- [ ] **E.5** Tests de **hooks**: `src/hooks/use-responsive.ts` (breakpoints, orientación).
- [ ] **E.6** Tests de **componentes/pantallas** con `@testing-library/react-native` (ya instalado, sin usar):
      `src/components/**`, `src/screens/**`, y rutas de `app/` (`login`, `register`, `calendar`, `kanban`).
      Mínimo: render, validación de formulario, navegación tras login.
- [ ] **E.7** Test de **api-client / infraestructura** (`src/infrastructure/**`): base URL configurable
      (sin `localhost` hardcodeado → `10.0.2.2` en emulador Android), manejo de 401 → logout.
- [ ] **E.8** Mocks de red (`axios`) para no depender del backend en los tests de UI.

**Criterio de aceptación:** cobertura Expo medida en CI con umbral que sube con el tiempo; ≥1 test por pantalla.

---

## Bloque F — Limpieza de deuda relacionada

- [ ] **F.1** Eliminar del root `package.json` el script `test:frontend` si D.1.Opción 1 se acepta.
- [ ] **F.2** Revisar `scripts/security-check.js` y `scripts/check-js-syntax.js`: si apuntan a
      `frontend/assets/js`, actualizarlos al código que exista.
- [ ] **F.3** Documentar la estrategia de tests en `ARCHITECTURE.md` (qué capa se testea con qué tipo).
- [ ] **F.4** Decidir destino de `DEPLOYMENT_GUIDE.md` (borrado pendiente en working tree).

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
