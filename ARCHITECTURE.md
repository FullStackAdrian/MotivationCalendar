# Arquitectura UseCase - Service - Controller - Presenter - View

Este documento describe la implementación del patrón arquitectónico **UseCase-Service-Controller-Presenter-View** para facilitar la implementación de nuevas vistas y funcionalidades tanto en el frontend como en el backend.

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
├── config/              # Configuración de la aplicación
├── controllers/         # Manejo de requests HTTP
│   └── auth.controller.js
├── usecases/            # Casos de uso (lógica de negocio)
│   ├── login-user.usecase.js
│   └── register-user.usecase.js
├── services/            # Servicios técnicos
│   └── user.service.js
├── presenters/          # Formateo de respuestas
│   └── auth.presenter.js
├── models/              # Acceso a datos
│   └── database.js
├── routes/              # Definición de rutas
│   └── auth.js
├── middleware/          # Middlewares de Express
└── server.js            # Punto de entrada
```

### Capas Backend

#### 1. Controller (`controllers/`)
- Recibe requests HTTP
- Extrae y valida datos básicos del request
- Delega al UseCase correspondiente
- Maneja errores y envía respuestas

```javascript
// Ejemplo: auth.controller.js
class AuthController {
  async register(req, res) {
    try {
      const { username, email, password } = req.body;
      const result = await this.registerUseCase.execute({ 
        username, email, password 
      });
      res.status(201).json(result);
    } catch (error) {
      this._handleError(error, res);
    }
  }
}
```

#### 2. UseCase (`usecases/`)
- Contiene la lógica de negocio principal
- Orquesta múltiples servicios si es necesario
- Valida reglas de negocio
- Es agnóstico al framework HTTP

```javascript
// Ejemplo: register-user.usecase.js
class RegisterUserUseCase {
  async execute({ username, email, password }) {
    this._validateInput({ username, email, password });
    
    const existingUser = await this.userService.findByUsernameOrEmail(username, email);
    if (existingUser) {
      throw new Error('El usuario ya está registrado');
    }
    
    const user = await this.userService.createUser({ username, email, password });
    const token = this.userService.generateToken(user);
    
    return this.presenter.presentRegistration(user, token);
  }
}
```

#### 3. Service (`services/`)
- Operaciones técnicas (DB, APIs externas, cryptografía)
- Sin lógica de negocio
- Reutilizable por múltiples UseCases

```javascript
// Ejemplo: user.service.js
class UserService {
  async createUser({ username, email, password }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = createUser(username, email, hashedPassword);
    return this._sanitizeUser(user);
  }
  
  generateToken(user) {
    return jwt.sign({ userId: user.id }, config.jwtSecret);
  }
}
```

#### 4. Presenter (`presenters/`)
- Transforma datos internos en formato de respuesta API
- Centraliza el formato de respuestas
- Facilita cambios en la estructura de respuestas

```javascript
// Ejemplo: auth.presenter.js
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

#### 5. Routes (`routes/`)
- Define endpoints HTTP
- Asocia rutas con métodos del controller
- Mínimo código, solo enrutamiento

```javascript
// Ejemplo: auth.js
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
```

---

## Arquitectura Frontend

### Estructura de Directorios

```
frontend/
├── assets/
│   ├── js/
│   │   ├── services/        # Comunicación con API
│   │   │   └── api.service.js
│   │   ├── usecases/        # Lógica de negocio frontend
│   │   │   ├── login-user.usecase.js
│   │   │   └── register-user.usecase.js
│   │   ├── presenters/      # Transformación de datos UI
│   │   │   └── auth.presenter.js
│   │   ├── views/           # Componentes UI
│   │   │   ├── login.view.js
│   │   │   └── register.view.js
│   │   ├── controllers/     # Coordinación UI-Lógica
│   │   │   └── auth.controller.js
│   │   └── app-refactored.js # Punto de entrada
│   └── css/
└── index.html
```

### Capas Frontend

#### 1. View (`views/`)
- Manejo directo del DOM
- Muestra/oculta elementos
- Captura eventos de usuario
- No contiene lógica de negocio

```javascript
// Ejemplo: login.view.js
class LoginView {
  constructor(elements) {
    this.container = elements.container;
    this.form = elements.form;
    this.identifierInput = elements.identifierInput;
    this.passwordInput = elements.passwordInput;
  }
  
  show() {
    this.container.style.display = 'block';
  }
  
  getFormData() {
    return {
      identifier: this.identifierInput.value,
      password: this.passwordInput.value
    };
  }
  
  onSubmit(callback) {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      callback(this.getFormData());
    });
  }
}
```

#### 2. Presenter (`presenters/`)
- Transforma respuestas de API para la UI
- Formatea errores para mostrar al usuario
- Centraliza el formato de datos UI

```javascript
// Ejemplo: auth.presenter.js
class AuthPresenter {
  presentLoginResponse(response) {
    return {
      success: true,
      user: {
        id: response.user?.id,
        username: response.user?.username
      },
      message: response.message || 'Login exitoso'
    };
  }
  
  presentAuthError(error) {
    return {
      success: false,
      message: error.message || 'Error de autenticación'
    };
  }
}
```

#### 3. Controller (`controllers/`)
- Coordina Views y UseCases
- Maneja navegación entre vistas
- Responde a eventos de usuario

```javascript
// Ejemplo: auth.controller.js
class AuthController {
  constructor({ loginView, loginUseCase, onAuthSuccess }) {
    this.loginView = loginView;
    this.loginUseCase = loginUseCase;
    this.onAuthSuccess = onAuthSuccess;
    this.init();
  }
  
  init() {
    this.loginView.onSubmit(async (data) => {
      await this.handleLogin(data.identifier, data.password);
    });
  }
  
  async handleLogin(identifier, password) {
    try {
      this.loginView.setLoading(true);
      const result = await this.loginUseCase.execute(identifier, password);
      this.onAuthSuccess(result.user);
    } catch (error) {
      this.loginView.showError(error.message);
    } finally {
      this.loginView.setLoading(false);
    }
  }
}
```

#### 4. UseCase (`usecases/`)
- Lógica de negocio frontend
- Validaciones específicas de UI
- Orquestación de servicios

```javascript
// Ejemplo: login-user.usecase.js
class LoginUserUseCase {
  async execute(identifier, password) {
    const response = await this.apiService.login(identifier, password);
    
    if (this.presenter) {
      return this.presenter.presentLoginResponse(response);
    }
    
    return response;
  }
}
```

#### 5. Service (`services/`)
- Comunicación con API backend
- Manejo de tokens y autenticación
- Almacenamiento local (localStorage)

```javascript
// Ejemplo: api.service.js
class ApiService {
  async login(identifier, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    
    if (data.token) {
      this.setToken(data.token);
    }
    
    return data;
  }
}
```

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
User Action (click, submit)
    ↓
View (captura evento)
    ↓
Controller (coordina)
    ↓
UseCase (lógica de negocio)
    ↓
Service (llamada API)
    ↓
Backend API
    ↓
Service ←
    ↓
UseCase ←
    ↓
Presenter (formatea para UI)
    ↓
Controller ←
    ↓
View (actualiza DOM)
```

---

## Cómo Implementar Nueva Funcionalidad

### Ejemplo: Agregar "Resetear Contraseña"

#### Backend

**1. Crear el Service Method** (`services/user.service.js`)
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

**2. Crear el UseCase** (`usecases/reset-password.usecase.js`)
```javascript
class ResetPasswordUseCase {
  async execute({ email }) {
    this._validateEmail(email);
    return await this.userService.resetPassword(email);
  }
}
```

**3. Crear el Presenter** (`presenters/auth.presenter.js`)
```javascript
presentResetPassword(message) {
  return {
    success: true,
    message
  };
}
```

**4. Actualizar el Controller** (`controllers/auth.controller.js`)
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

#### Frontend

**1. Crear la View** (`views/reset-password.view.js`)
```javascript
class ResetPasswordView {
  constructor(elements) {
    this.container = elements.container;
    this.form = elements.form;
    this.emailInput = elements.emailInput;
  }
  
  // ... métodos show, hide, getFormData, etc.
}
```

**2. Crear el UseCase** (`usecases/reset-password.usecase.js`)
```javascript
class ResetPasswordUseCase {
  async execute(email) {
    const response = await this.apiService.resetPassword(email);
    return this.presenter.presentResetResponse(response);
  }
}
```

**3. Actualizar el Controller** (`controllers/auth.controller.js`)
```javascript
async handleResetPassword(email) {
  try {
    const result = await this.resetPasswordUseCase.execute(email);
    this.resetView.showMessage(result.message);
  } catch (error) {
    this.resetView.showError(error.message);
  }
}
```

**4. Agregar al HTML** (`index.html`)
```html
<div id="reset-section" class="auth-container" style="display: none;">
  <form id="reset-form">
    <input type="email" id="reset-email" required>
    <button type="submit">Enviar</button>
  </form>
</div>
```

**5. Actualizar app-refactored.js**
```javascript
const resetView = new ResetPasswordView({...});
const resetUseCase = new ResetPasswordUseCase(...);

// Agregar listeners y navegación
```

---

## Ejemplos de Uso

### Backend: Estructura Completa de Auth

```
routes/auth.js
  ↓
controllers/auth.controller.js
  ├─ register() → usecases/register-user.usecase.js
  └─ login() → usecases/login-user.usecase.js
                ↓
          services/user.service.js
                ↓
          models/database.js
                ↓
          presenters/auth.presenter.js
```

### Frontend: Estructura Completa de Auth

```
index.html (Views)
  ↓
app-refactored.js
  ├─ LoginView → AuthController → LoginUserUseCase → ApiService
  └─ RegisterView → AuthController → RegisterUserUseCase → ApiService
                    ↓
              AuthPresenter (formatea respuesta)
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

- **No mezclar lógica de negocio en controllers**
- **No acceder directamente al DOM desde UseCases o Services**
- **No hacer llamadas HTTP desde Views**
- **No duplicar validaciones** entre capas (cada una tiene las suyas)
- **No crear dependencias circulares** entre módulos

---

## Testing

### Ejemplo de Test para UseCase (Backend)

```javascript
// tests/usecases/register-user.test.js
describe('RegisterUserUseCase', () => {
  it('debe registrar un usuario correctamente', async () => {
    const mockUserService = {
      findByUsernameOrEmail: jest.fn().mockResolvedValue(null),
      createUser: jest.fn().mockResolvedValue({ id: 1, username: 'test' }),
      generateToken: jest.fn().mockReturnValue('token123')
    };
    
    const useCase = new RegisterUserUseCase(mockUserService);
    const result = await useCase.execute({
      username: 'test',
      email: 'test@example.com',
      password: 'password123'
    });
    
    expect(result.token).toBe('token123');
  });
});
```

### Ejemplo de Test para View (Frontend)

```javascript
// tests/views/login.test.js
describe('LoginView', () => {
  it('debe obtener datos del formulario', () => {
    const mockElements = {
      container: document.createElement('div'),
      form: document.createElement('form'),
      identifierInput: { value: 'test' },
      passwordInput: { value: '123456' }
    };
    
    const view = new LoginView(mockElements);
    const data = view.getFormData();
    
    expect(data.identifier).toBe('test');
    expect(data.password).toBe('123456');
  });
});
```

---

## Conclusión

Esta arquitectura proporciona una base sólida para el crecimiento del proyecto. Cada nueva funcionalidad sigue el mismo patrón, haciendo que el código sea predecible y fácil de mantener.

**Para implementar cualquier nueva feature:**
1. Identifica qué capas necesitas modificar/crear
2. Sigue el orden: Service → UseCase → Presenter → Controller → View
3. Mantén las responsabilidades separadas
4. Documenta las interfaces entre capas
