# AGENTS.md — Cómo trabajar en este repo

Guía operativa para la próxima feature. El repo es un calendario motivacional:
backend Express + Sequelize/Postgres (`backend/`) y app Expo (`frontend/`).
Se trabaja con TDD y arquitectura por capas. La CI es estricta: no se da
por terminado nada que no esté en verde.

## 1. Flujo de ramas y commits

- Rama nueva desde `master`: `feature/<tema>` o `fix/<tema>`.
- Nunca commitear directo a `master` salvo docs triviales; el trabajo va en PR.
- Commits pequeños y con etiqueta de fase TDD:
  `test(<ámbito>): ... (RED)` primero, `fix(<ámbito>): ... (GREEN)` después.
- Todo lo generado o secreto está ignorado: `backend/downloads/*.apk`,
  `frontend/android/`, `.env*` (verificado por `scripts/security-check.js`).
  No forzar nunca estos ficheros con `git add -f`.

## 2. TDD obligatorio (RED → GREEN → verificar)

1. Escribir el test que falla primero y ejecutarlo para confirmar el ROJO.
2. Implementar lo mínimo para ponerlo en verde.
3. Pasar las puertas locales (sección 5) antes de pushear.

## 3. Backend: SOLID por capas

```
backend/domain/            ← reglas de negocio, sin dependencias de infra
  kanban.ts                ← validación y entidades (normalize*, VALID_*)
  services/*.service.ts    ← casos de uso; solo hablan con puertos
  repositories/*.ts        ← PUERTOS (interfaces). Al añadir un método al
                             servicio que necesite persistencia, la interfaz
                             del puerto se extiende aquí primero
  types.ts                 ← tipos compartidos (excluido de cobertura)
backend/infrastructure/    ← adaptadores: sequelize-*.repository.ts, routes/*.ts
test/*.test.ts             ← unitarios con node:test + tsx (fakes en memoria)
test/integration/*.test.ts ← contra Postgres real (scripts/test-db-up.sh)
```

- **S**ingle responsibility: validación en `domain/kanban.ts`, orquestación en
  el servicio, SQL solo en adaptadores, HTTP solo en rutas.
- **O**pen/closed: nueva capacidad = nuevo método en servicio + puerto,
  sin modificar los existentes salvo que cambie la regla de negocio.
- **L**iskov/segregación: los fakes de `test/` implementan el puerto completo;
  si añades un método al puerto, añádelo también a los fakes.
- **D**ependency inversion: el servicio recibe repositorios por constructor,
  nunca importa Sequelize.
- Reglas de negocio con implicación de seguridad (quién puede borrar/editar)
  van en el servicio (`isOwner`/`hasAccess`), no en la ruta. Las rutas solo
  traducen HTTP↔servicio y mapean errores (`mapKanbanErrorResponse`).

## 4. Frontend: Expo + jest mult-proyecto

- Estructura: `src/screens/`, `src/components/`, `src/infrastructure/`,
  `src/hooks/`, `src/domain/`. Repositorio HTTP en
  `src/infrastructure/kanban/kanban.repository.ts` (un método por endpoint).
- Tests con `jest-expo/universal`: **cada suite corre 4 veces**
  (Android/iOS/Node/Web). La UI solo se testea en nativo:
  usar `describeNative` de `__tests__/helpers/projects`.
- **OJO — flake conocido**: el preset de RN polifilea
  `requestAnimationFrame` con un `setTimeout` real. Si un test dispara
  eventos de teclado/scroll con RAF sin mockear, el timer puede ejecutarse
  tras el teardown y jest sale con código 1 **con todos los tests en verde**.
  Patrón obligatorio en esos ficheros (ver `keyboard-avoiding.test.tsx`):
  ```ts
  let rafSpy: jest.SpyInstance;
  beforeEach(() => {
    rafSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(((cb: () => void) => { cb(); return 0; }) as never);
  });
  afterEach(() => { rafSpy.mockRestore(); });
  ```
- `scripts/frontend-smoke-expo.js` prohíbe `localhost`/`127.0.0.1` en
  `frontend/{app,src}` salvo en líneas que mencionen `EXPO_PUBLIC_*` o
  `process.env`. Centralizar literales de loopback en una constante anotada.
- Botones: usar `PrimaryButton`/`SecondaryButton` de `components/ui`
  (ya exponen `accessibilityState.disabled`; los tests lo usan para
  afirmar estados deshabilitados). Confirmaciones destructivas en dos pasos
  (botón → "Confirmar borrado"), no `Alert`.
- Cada endpoint nuevo del backend necesita su método en el repositorio
  antes de cablear UI.

## 5. Puertas locales (pasarlas TODAS antes del push)

```sh
npm run lint                        # typecheck + sintaxis
npm run test:unit                   # backend, sin BD
npm run test:integration            # backend, requiere Postgres (scripts/test-db-up.sh)
npm run test:frontend               # smoke test Expo (hosts, rutas, metro/babel)
npm run test:coverage               # backend, umbrales .c8rc.json (80/80/80/70)
npm test --prefix frontend          # jest UI + lógica (4 proyectos)
npm run test:coverage --prefix frontend  # umbrales: 70/70/75/70 (stmts/branches/funcs/lines)
npm run typecheck --prefix frontend
```

## 6. CI (GitHub Actions, `.github/workflows/ci.yml`)

- Dispara en PR y en push a `master`. Sin PR abierta no hay CI en la rama.
- Jobs: `test` (lint, security-check, unit, integración, smoke,
  cobertura, audit), `unit-hermetic`, `frontend-expo`
  (typecheck, tests, cobertura, `export:web`), `docker` (build + compose).
- Los logs de CI requieren login; las **anotaciones son públicas** y sirven
  para diagnosticar sin acceso.
- Si un fallo no reproduce en local, sospechar flakiness de timers/RAF
  (sección 4) antes que lógica.

## 7. APK Android

- `scripts/build-android-apk.sh` exige `EXPO_PUBLIC_API_URL` (falla cerrado
  sin ella: el APK hornea la URL en build) y JDK 17
  (`usesCleartextTraffic` ya activado para HTTP en LAN).
- El APK publicado se sirve en `/downloads/motivation-calendar.apk`
  (mismo origen que la web). Tras construirlo hay que reconstruir la imagen
  del backend (`docker compose up -d --build backend`), porque la imagen
  lo lleva empaquetado.
