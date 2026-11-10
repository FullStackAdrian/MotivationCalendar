# Arquitectura UseCase - Service - Controller - Presenter - View

Este documento describe la implementación del patrón arquitectónico **UseCase-Service-Controller-Presenter-View** para facilitar la implementación de nuevas vistas y funcionalidades tanto en el frontend como en el backend.

> **Backend en TypeScript (strict)**: todo `backend/` es `.ts`. Comandos: `npm run typecheck` · `npm run build` (emite a `backend/dist/`) · `npm run dev` (tsx watch) · `npm test` (tsx + node:test) · `npm run test:coverage` (c8 remapea V8 coverage al fuente `.ts`; umbrales 80% líneas/funciones). Los puertos de dominio son interfaces reales (`domain/repositories/*.ts`) y los DTOs viven en `domain/types.ts`; la composición de dependencias ocurre en infrastructure (controllers y routes).

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura Backend](#arquitectura-backend)
3. [Arquitectura Frontend](#arquitectura-frontend)
4. [Flujo de Datos](#flujo-de-datos)
5. [Cómo Implementar Nueva Funcionalidad](#cómo-implementar-nueva-funcionalidad)
6. [Ejemplos](#ejemplos)

---

## Descripción General

Esta arquitectura separa responsabilidades en capas bien definidas:

| Capa | Responsabilidad |
|------|----------------|
| **View** | Presentación UI, manejo del DOM |
| **Presenter** | Transformación de datos para la UI |
| **Controller** | Coordinación entre views y casos de uso |
| **UseCase** | Lógica de negocio y reglas de aplicación |
| **Service** | Operaciones técnicas (API, DB, autenticación) |

### Beneficios

✅ **Testeabilidad**: Cada capa puede probarse independientemente  
✅ **Mantenibilidad**: Cambios aislados en cada capa  
✅ **Reutilización**: Servicios y casos de uso compartibles  
✅ **Escalabilidad**: Fácil agregar nuevas features  
✅ **Separación de preocupaciones**: Código más limpio y organizado  

---

## Arquitectura Backend

### Estructura de Directorios

```
backend/
├── server.ts              # Punto de entrada
├── application/           # Capa de aplicación (sin dependencias de infraestructura)
│   ├── usecases/          # Casos de uso: orquestan middlewares → servicios
│   │   ├── login-user.usecase.ts
│   │   └── register-user.usecase.ts
│   ├── middlewares/       # Pipeline del caso de uso
│   │   ├── validation.middleware.ts   # valida entradas con zod → ValidationError
│   │   └── error-handler.middleware.ts # clasifica errores en códigos semánticos
│   └── schemas/           # Contratos de entrada declarativos (zod)
│       ├── login-user.schema.ts
│       └── register-user.schema.ts
├── domain/                # Núcleo de negocio
│   ├── kanban.ts          # Entidad kanban (transiciones, WIP, recurrencias)
│   ├── repositories/      # PUERTOS de persistencia (tipos TS)
│   │   ├── user.repository.ts
│   │   ├── board.repository.ts
│   │   ├── column.repository.ts
│   │   └── task.repository.ts
│   └── services/          # Servicios de dominio (sin Sequelize ni crypto)
│       ├── kanban.service.ts
│       └── user.service.ts
└── infrastructure/        # Adaptadores y detalles técnicos
    ├── config/            # Configuración de la aplicación
    │   └── config.ts
    ├── controllers/       # Manejo de requests HTTP + composición de dependencias
    │   └── auth.controller.ts
    ├── security/          # Adaptadores criptográficos
    │   ├── password-hasher.ts  # bcryptjs
    │   └── token-provider.ts   # jsonwebtoken (única fuente JWT)
    ├── repositories/      # ADAPTADORES Sequelize de los puertos de domain
    │   ├── sequelize-user.repository.ts
    │   ├── sequelize-board.repository.ts   # incluye membresías; transacciones aquí
    │   ├── sequelize-column.repository.ts  # tx de reorderPositions aquí
    │   └── sequelize-task.repository.ts    # incluye ocurrencias
    ├── presenters/        # Formateo de respuestas
    │   └── auth.presenter.ts
    ├── models/            # Acceso a datos (Sequelize)
    │   ├── database.ts
    │   └── kanban.database.ts
    ├── routes/            # Definición de rutas
    │   ├── auth.ts
    │   ├── kanban.ts
    │   └── progress.ts
    └── middleware/        # Middlewares del pipeline HTTP de Express
        └── auth.ts             # delega verificación en TokenProvider
```

### Capas Backend

#### 1. Controller (`infrastructure/controllers/`)
- Recibe requests HTTP
- **Composition root del flujo**: ensambla servicios, adaptadores y middlewares e inyecta todo al UseCase
- Traduce códigos semánticos de error a estados HTTP (`CODE_TO_HTTP`)
- Envía respuestas

```javascript
// Ejemplo: auth.controller.ts
class AuthController {
  async register(req, res) {
    try {
      const result = await this.registerUseCase.execute(req.body);
      res.status(201).json(result);
    } catch (error) {
      const statusCode = CODE_TO_HTTP[error.code] || 500;
      res.status(statusCode).json({ error: error.message });
    }
  }
}
```

#### 2. UseCase (`application/usecases/`)
- Orquesta el pipeline: **middleware de validación → reglas de negocio → servicios → presentación**
- Todo envuelto por el middleware de gestión de errores (`this.errorHandler.run(...)`)
- Recibe TODAS sus dependencias inyectadas (sin defaults): imposible importar infraestructura
- Es agnóstico al framework HTTP y a las librerías criptográficas

```javascript
// Ejemplo: register-user.usecase.ts
async execute(input) {
  return this.errorHandler.run(async () => {
    const data = this.validator.validate(registerUserSchema, input); // ValidationError → 400

    const existingUser = await this.userService.findByUsernameOrEmail(data.username, data.email);
    if (existingUser) throw new Error('El usuario o email ya está registrado'); // CONFLICT

    const passwordHash = await this.passwordHasher.hash(data.password);
    const user = await this.userService.createUser({ ...data, passwordHash });
    return this.presenter.presentRegistration(user, this.tokenProvider.generate(user));
  });
}
```

#### 2b. Middlewares del caso de uso (`application/middlewares/`)
- `ValidationMiddleware.validate(schema, input)`: valida con zod; lanza `ValidationError` con mensaje normalizado
- `ErrorHandlerMiddleware.run(operation)`: captura cualquier fallo y le adjunta un código semántico (`VALIDATION_ERROR`, `UNAUTHORIZED`, `CONFLICT`, `INTERNAL_ERROR`) mediante su catálogo de errores de negocio
- Los códigos son independientes del transporte: el controller los traduce a HTTP
- Viven en application (no en infrastructure) porque los orquesta el usecase y no dependen de ningún mecanismo de entrega

#### 3. Service (`domain/services/`)
- Solo lógica de dominio: reglas de negocio y orquestación de puertos
- **Sin Sequelize**: consumen los puertos de `domain/repositories/` inyectados
- **Sin hashing ni JWT**: eso vive en `infrastructure/security/`
- Trabajan con objetos planos; las transacciones viven en los adaptadores

#### 3b. Repositorios (puertos en `domain/repositories/`, adaptadores en `infrastructure/repositories/`)
- Los puertos son clases abstractas JS que declaran el contrato en lenguaje de negocio (`hasAccess`, `findByIdWithDetails`, `countActiveInColumn`...)
- Los adaptadores Sequelize implementan los puertos, encapsulan `Op`, asociaciones (`include`), `transaction` y `findOrCreate`, y devuelven objetos planos vía `toJSON()`
- La composición ocurre en infrastructure: controllers y routes construyen los servicios con sus adaptadores
- Beneficio: los servicios se testean con fakes in-memory sin base de datos

#### 3b. Adaptadores de seguridad (`infrastructure/security/`)
- `PasswordHasher`: único punto que toca bcryptjs (`hash` / `compare`)
- `TokenProvider`: única fuente de verdad JWT (`generate` / `verify`); el middleware Express de auth delega en él

#### 4. Presenter (`infrastructure/presenters/`)
- Transforma datos internos en formato de respuesta API
- Centraliza el formato de respuestas
- Facilita cambios en la estructura de respuestas

```javascript
// Ejemplo: auth.presenter.ts
class AuthPresenter {
  presentRegistration(user, token) {
    return {
      message: 'Usuario registrado exitosamente',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    };
  }
}
```

#### 5. Routes (`infrastructure/routes/`)
- Define endpoints HTTP
- Asocia rutas con métodos del controller
- Mínimo código, solo enrutamiento

```javascript
// Ejemplo: auth.js
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
```

---

## Arquitectura Frontend (Expo + React Native)

App Expo (SDK 57, `expo-router`): el antiguo frontend web vanilla (`index.html` +
`assets/js/**`) se eliminó; el backend es API-only y el despliegue web sale de
`expo export --platform web`.

### Estructura de Directorios

```
frontend/
├── app/                    # Rutas expo-router (cada fichero = pantalla)
│   ├── _layout.tsx         # Stack + AuthProvider
│   ├── index.tsx           # Redirect según sesión
│   ├── login.tsx / register.tsx / calendar.tsx / kanban.tsx / archive.tsx
├── src/
│   ├── components/         # ui.tsx (Screen, Button, Field, Badge, AppHeader), Icon.tsx
│   ├── screens/            # login/register/calendar/kanban/archive-screen.tsx
│   ├── contexts/           # auth-context.tsx (AuthProvider + useAuth, JWT en secure-store)
│   ├── hooks/              # use-responsive.ts (breakpoints sm/md/lg)
│   ├── domain/calendar/    # lógica pura de calendario (sin RN)
│   ├── infrastructure/
│   │   ├── http/api-client.ts        # axios + baseURL (10.0.2.2 en Android) + 401 → logout
│   │   ├── auth/                     # auth.repository.ts, token-storage.ts
│   │   ├── calendar/calendar.repository.ts
│   │   └── kanban/kanban.repository.ts
│   └── theme.ts
├── __tests__/              # Jest jest-expo/universal (4 proyectos)
└── app.json                # slug, scheme, android.package, plugins expo-router/secure-store
```

### Capas Frontend

#### 1. Pantallas (`screens/` + `app/` como re-export)
- Componentes React con `useAuth()` y `useRouter()` mockeables.
- Formularios con validación local (botón deshabilitado hasta completar) y navegación tras éxito (`router.replace('/calendar')`).

#### 2. Contexto (`contexts/auth-context.tsx`)
- `AuthProvider` hidrata el JWT al arrancar, expone `login/register/logout`.
- Tokens expirados, anónimos o malformados → usuario `null`.

#### 3. Infraestructura (`infrastructure/`)
- `ApiClient` centraliza axios: inyecta `Authorization`, convierte 401 en logout.
- Repositorios (`calendar`, `kanban`, `auth`) mapean endpoints; sin lógica de negocio.

#### 4. Dominio (`domain/calendar/`)
- Funciones puras (día del año, estado visual, recurrencias). Sin dependencias RN: corren en los 4 proyectos Jest.

---

## Flujo de Datos

### Backend: Request → Response

```
HTTP Request
    ↓
Routes (enrutamiento)
    ↓
Controller (recibe request)
    ↓
UseCase (lógica de negocio)
    ↓
Service (operaciones técnicas)
    ↓
Model/Database (acceso a datos)
    ↓
Service ←
    ↓
UseCase ←
    ↓
Presenter (formatea respuesta)
    ↓
Controller ←
    ↓
HTTP Response
```

### Frontend: User Action → UI Update

```
User Action (tap, submit)
    ↓
Screen (captura evento, valida formulario)
    ↓
useAuth() / repositorio (login, getProgress, moveTask…)
    ↓
ApiClient (axios + JWT; 401 → logout)
    ↓
Backend API
    ↓
setState → re-render
    ↓
router.replace/push (navegación expo-router)
```

---

## Cómo Implementar Nueva Funcionalidad

### Ejemplo: Agregar "Resetear Contraseña"

#### Backend

**1. Crear el Service Method** (`services/user.service.ts`)
```javascript
async resetPassword(email) {
  const user = await this._findUserByEmail(email);
  if (!user) {
    throw new Error('No existe un usuario con ese email');
  }
  
  const resetToken = this.generateResetToken(user);
  await this.sendResetEmail(user.email, resetToken);
  
  return { message: 'Email de recuperación enviado' };
}
```

**2. Crear el UseCase** (`usecases/reset-password.usecase.ts`)
```javascript
class ResetPasswordUseCase {
  async execute({ email }) {
    this._validateEmail(email);
    return await this.userService.resetPassword(email);
  }
}
```

**3. Crear el Presenter** (`presenters/auth.presenter.ts`)
```javascript
presentResetPassword(message) {
  return {
    success: true,
    message
  };
}
```

**4. Actualizar el Controller** (`controllers/auth.controller.ts`)
```javascript
async resetPassword(req, res) {
  try {
    const { email } = req.body;
    const result = await this.resetPasswordUseCase.execute({ email });
    res.json(result);
  } catch (error) {
    this._handleError(error, res);
  }
}
```

**5. Agregar la Ruta** (`routes/auth.js`)
```javascript
router.post('/reset-password', (req, res) => 
  authController.resetPassword(req, res)
);
```

#### Frontend (pantalla + repositorio)

**1. Nueva pantalla** (`src/screens/reset-password-screen.tsx` + ruta en `app/`):
componente con `Field` + `PrimaryButton`, validación local y llamada al repositorio;
errores en estado local, éxito con `router.replace(...)`.

**2. Método en el repositorio** (`infrastructure/auth/auth.repository.ts`):
`resetPassword(email)` → `apiClient.post('/api/auth/reset', { email })`.
Sin lógica de negocio: mapea el endpoint.

**3. Tests** (`frontend/__tests__/`): render + validación + navegación con
`expo-router` y `useAuth` mockeados; `axios` mockeado (ver `helpers/projects.ts`
para el alcance por proyecto: UI solo en android/ios).

---

## Ejemplos de Uso

### Backend: Estructura Completa de Auth

```
routes/auth.ts
  ↓
controllers/auth.controller.ts
  ├─ register() → usecases/register-user.usecase.ts
  └─ login() → usecases/login-user.usecase.ts
                ↓
          services/user.service.ts
                ↓
          models/database.ts
                ↓
          presenters/auth.presenter.ts
```

### Frontend: Estructura Completa de Auth (Expo)

```
app/login.tsx → screens/login-screen.tsx
    ↓
useAuth().login() (contexts/auth-context.tsx)
    ↓
AuthRepository.login() → ApiClient (axios + JWT en secure-store)
    ↓
POST /api/auth/login → router.replace('/calendar')
```

---

## Mejores Prácticas

### ✅ DO's

- **Mantener cada capa enfocada en su responsabilidad única**
- **Usar inyección de dependencias** para facilitar testing
- **Manejar errores en cada capa** apropiadamente
- **Documentar interfaces entre capas** con JSDoc
- **Nombres descriptivos** para clases y métodos

### ❌ DON'Ts

- **No mezclar lógica de negocio en pantallas ni contextos**
- **No hacer llamadas HTTP fuera de `ApiClient`/repositorios**
- **No duplicar validaciones** entre capas (cada una tiene las suyas)
- **No crear dependencias circulares** entre módulos

---

## Testing

Estrategia actual (ver `TODO.md` y `.c8rc.json` / `frontend/package.json`):

| Capa | Herramienta | Qué se testea |
|---|---|---|
| Dominio backend (`domain/**`) | Node test runner + `tsx` (`test/*.test.ts`) | Lógica pura: transiciones kanban, WIP, recurrencias, validaciones. Sin BD, rápido. |
| Aplicación backend (`application/**`) | Node test runner | Schemas Zod (transformaciones, mensajes), usecases con puertos mockeados. |
| Infraestructura backend | Node test runner + Postgres real (`test/integration/`) | Repositorios Sequelize (nulls, rollback), seguridad (JWT expirado/firma/alg, bcrypt), rutas HTTP (403/400/500), arranque y shutdown. |
| Cobertura backend | `c8` + `.c8rc.json` | `lines/functions/statements: 80`, `branches: 70`, `all: true`, `perFile: true`. `npm run test:coverage` falla si un fichero queda bajo el umbral. |
| Dominio frontend (`src/domain`) | Jest `jest-expo/universal` (`frontend/__tests__/`) | Lógica pura de calendario. Corre en los 4 proyectos. |
| Infraestructura frontend | Jest + mocks (`axios`, `expo-secure-store`) | `api-client` (baseURL por plataforma, 401 → logout), `token-storage` (web vs nativo), repositorios. |
| Contextos y hooks | Jest + `@testing-library/react-native` | `AuthProvider` (login/logout/persistencia/expiración), `useResponsive` (breakpoints). Solo proyectos nativos (ver `__tests__/helpers/projects.ts`). |
| Componentes y pantallas | Jest + RTL, `expo-router` y `useAuth` mockeados | Render, validación de formularios y navegación (`login`, `register`, `calendar`, `kanban`, `archive`, rutas `app/`). Solo proyectos nativos. |
| Smoke estático | `scripts/frontend-smoke-expo.js` (`npm run test:frontend`) | `app.json`, rutas, hosts prohibidos, metro/babel. Sin ejecutar la app. |
| CI | `.github/workflows/ci.yml` | Job `test`: lint → unit → integración → smoke → cobertura → audit. Job `frontend-expo`: typecheck → jest (+cobertura) → `expo export --web`. |

---

## Conclusión

Esta arquitectura proporciona una base sólida para el crecimiento del proyecto. Cada nueva funcionalidad sigue el mismo patrón, haciendo que el código sea predecible y fácil de mantener.

**Para implementar cualquier nueva feature:**
1. Identifica qué capas necesitas modificar/crear
2. Sigue el orden: Service → UseCase → Presenter → Controller → View
3. Mantén las responsabilidades separadas
4. Documenta las interfaces entre capas
