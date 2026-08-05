# 2026 Tracker - Backend & Frontend

Aplicación de seguimiento de hábitos para el año 2026, con autenticación JWT y sincronización multi-dispositivo.

## Estructura del Proyecto

```
/workspace
├── backend/                 # Servidor Node.js/Express
│   ├── config/             # Configuración del servidor
│   │   └── config.js
│   ├── middleware/         # Middlewares (auth JWT)
│   │   └── auth.js
│   ├── models/             # Modelos de datos
│   │   └── database.js
│   ├── routes/             # Rutas de la API
│   │   ├── auth.js         # Registro y login
│   │   └── progress.js     # Gestión del progreso
│   └── server.js           # Punto de entrada principal
│
├── frontend/               # Aplicación cliente
│   ├── index.html          # HTML principal
│   └── assets/
│       ├── css/
│       │   └── styles.css  # Estilos
│       ├── images/         # Recursos gráficos
│       └── js/
│           ├── api-client.js  # Cliente API REST
│           └── app.js         # Lógica de la UI
│
├── .env                    # Variables de entorno
├── package.json            # Dependencias y scripts
└── README.md               # Este archivo
```

## Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno (opcional)
# Editar .env con:
# PORT=3000
# JWT_SECRET=tu-secreto-super-seguro
```

## Ejecución

```bash
# Iniciar el servidor (backend + frontend estático)
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión

### Progreso (requiere autenticación)
- `GET /api/progress` - Obtener progreso del usuario
- `POST /api/progress` - Guardar progreso completo
- `PATCH /api/progress/:day` - Actualizar un día específico

### Usuario
- `GET /api/me` - Obtener información del usuario actual

## Clean Code Applied

### Backend
- **Separación de responsabilidades**: Routes, controllers, middleware y modelos separados
- **Configuración centralizada**: `config/config.js` para variables globales
- **Middleware reutilizable**: `authenticateToken` separado en su propio módulo
- **Modelo de datos encapsulado**: Funciones claras para operaciones de DB
- **Rutas organizadas**: Auth y progress en archivos separados

### Frontend
- **API Client separado**: `api-client.js` maneja toda la comunicación con el backend
- **Funciones puras**: Cada función tiene una responsabilidad única
- **Código documentado**: JSDoc comments en funciones principales
- **Manejo de errores**: Try-catch y validaciones apropiadas
- **UI lógica separada**: Funciones específicas para renderizado y estado

## Características

- ✅ Autenticación con JWT (tokens de 30 días)
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Sincronización multi-dispositivo
- ✅ Modo offline como fallback (localStorage)
- ✅ Diseño responsive y minimalista
- ✅ Grid interactivo de 365 días
- ✅ Estadísticas en tiempo real

## Tecnologías

**Backend:**
- Node.js + Express
- JSON Web Tokens (JWT)
- Bcryptjs para hashing
- CORS habilitado

**Frontend:**
- HTML5 + CSS3
- Vanilla JavaScript (ES6+)
- LocalStorage para caché
- Fetch API para HTTP

## Notas de Producción

Para producción, se recomienda:
1. Cambiar `JWT_SECRET` a un valor seguro y único
2. Reemplazar la base de datos en memoria por MongoDB/PostgreSQL
3. Habilitar HTTPS
4. Configurar rate limiting
5. Añadir validación de entrada más estricta
