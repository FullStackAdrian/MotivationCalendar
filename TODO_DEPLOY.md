# TODO — Endurecimiento pre-deploy

> Rama: `chore/pre-deploy-hardening` (base: `master`)
> Auditoría realizada el 2026-11-10. Tests y cobertura en verde; lo que sigue
> son los huecos reales antes de exponer la app: artefactos de despliegue rotos,
> superficie de ataque abierta y datos demo para staging.

---

## Bloqueantes (sin esto el deploy falla o nace vulnerable)

- [ ] **P.1** `deploy.yml` genera un artefacto backend que no arranca.
      Hoy hace `tar` de `backend/` (fuentes `.ts`) + `package.json` sin compilar;
      como `backend/dist/` está ignorado, el tarball no sirve para
      `node backend/dist/server.js`. Además declara `NODE_VERSION` sin instalar Node.
      - Añadir `setup-node` + `npm ci` + `npm run build` y empaquetar con `dist/`.
      - Aceptación: descargar el artifact en local, `node backend/dist/server.js`
        arranca con `DATABASE_URL` de prueba.
- [ ] **P.2** El frontend de Pages apunta a `localhost`.
      `EXPO_PUBLIC_API_URL` se incrusta en build-time y `deploy-pages.yml` no la define,
      así que el export hornea el fallback `http://localhost:3000`.
      - Inyectar `EXPO_PUBLIC_API_URL: ${{ secrets.EXPO_PUBLIC_API_URL }}` en el paso
        `export:web` y documentar el secret requerido.
      - Aceptación: `grep` del `dist/index.html` no contiene `localhost:3000`.
- [ ] **P.3** Sin rate limiting en auth.
      `POST /api/auth/login` y `/register` aceptan intentos ilimitados (fuerza bruta).
      - Añadir `express-rate-limit` en ambas rutas (p. ej. 10 intentos / 15 min por IP),
        con `trust proxy` si va tras nginx, y test del 429.
      - Aceptación: 11º login seguido → `429`; resto de la suite en verde.

## Recomendadas (no bloquean el deploy)

- [ ] **P.4** Seeder demo idempotente solo para staging.
      Los tests crean sus datos; esto es para probar la app de punta a punta con
      tableros/tareas reales. Script `scripts/seed-demo.ts` (o similar) protegido por
      `SEED_DEMO=true`, nunca en prod. Documentar uso.
      - Aceptación: doble ejecución no duplica datos; en prod sin la flag no hace nada.
- [ ] **P.5** Alinear versión de Node.
      `backend/Dockerfile` usa node:20, CI y frontend usan 22.
      - Subir el backend a node:22-alpine y verificar `docker.yml` en CI.
- [ ] **P.6** Decidir política de JWT.
      Hoy access token de 30 días sin rotación (`JWT_EXPIRES_IN`). Aceptable para MVP;
      si se quiere más, refresh tokens con rotación (funcionalidad nueva, no deuda).

## Verificado y bien (no tocar)

- `sequelize.sync()` es create-only (sin `alter`); migraciones pueden esperar.
- `.env` nunca versionado; `JWT_SECRET` con longitud mínima en prod.
- Headers de seguridad manuales, CORS configurable, bcrypt cost 10, payloads a 100kb.
- Healthchecks Docker correctos; tarball sin secretos.
- Backend 99.4/90.2/99.7/99.4 y Expo 70.8/75.7/77.4 con gates en verde.

## Orden sugerido

1. PR pequeña: **P.1 + P.2** (despliegues que hoy salen rotos).
2. PR pequeña: **P.3** (seguridad) + test del 429.
3. PR pequeña: **P.4** (seeder) + **P.5** (Node 22).
4. **P.6** solo si se decide rotación ( scope aparte ).
