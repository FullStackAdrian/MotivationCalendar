# 📦 Configuración de PostgreSQL para Motivation Calendar

Este documento explica cómo configurar la base de datos PostgreSQL para el proyecto.

## ✅ Cambios Realizados

1. **Se implementó Sequelize ORM** en `backend/models/database.js` para persistencia en PostgreSQL
2. **Se actualizaron todas las funciones** a async/await
3. **Se agregaron modelos** para `User` y `Progress`
4. **Se actualizó el servidor** para inicializar la DB al arrancar
5. **Se corrigieron bugs** de autenticación (imports inexistentes y lógica rota)

## 🚀 Instalación

### 1. Instalar dependencias

```bash
npm install
```

Las siguientes dependencias fueron agregadas:
- `sequelize` - ORM para Node.js
- `pg` - Driver de PostgreSQL
- `pg-hstore` - Soporte para tipo HSTORE de PostgreSQL

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de PostgreSQL:

```env
# Puerto del servidor
PORT=3000

# Secreto para JWT (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET=tu-secreto-super-seguro-cambia-en-produccion

# Entorno
NODE_ENV=development

# ==========================================
# Configuración de PostgreSQL
# ==========================================
# Opción 1: URL completa (recomendado para producción)
DATABASE_URL=postgres://usuario:password@localhost:5432/motivation_calendar

# Opción 2: Variables individuales (se usa si DATABASE_URL no está definida)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=motivation_calendar
DB_USER=postgres
DB_PASSWORD=postgres

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 3. Instalar PostgreSQL

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS (con Homebrew):
```bash
brew install postgresql
brew services start postgresql
```

#### Windows:
Descarga e instala desde: https://www.postgresql.org/download/windows/

### 4. Crear base de datos y usuario

```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# O en Windows/macOS:
psql -U postgres
```

En la consola de PostgreSQL:

```sql
-- Crear base de datos
CREATE DATABASE motivation_calendar;

-- Crear usuario (opcional, si no quieres usar el usuario postgres)
CREATE USER motivation_user WITH PASSWORD 'tu_password_seguro';

-- Dar permisos
GRANT ALL PRIVILEGES ON DATABASE motivation_calendar TO motivation_user;

-- Salir
\q
```

### 5. Iniciar el servidor

```bash
npm start
```

Verás un mensaje como:

```
✅ Conexión a PostgreSQL establecida correctamente
✅ Tablas sincronizadas correctamente

╔════════════════════════════════════════════╗
║  🚀 Servidor corriendo en puerto 3000      ║
║  📍 http://localhost:3000                 ║
║  🔧 Environment: development             ║
║  💾 PostgreSQL conectado                    ║
╚════════════════════════════════════════════╝
```

## 📊 Estructura de la Base de Datos

### Tabla `users`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | STRING (PK) | ID único generado automáticamente |
| username | STRING (UNIQUE) | Nombre de usuario |
| email | STRING (UNIQUE) | Email del usuario |
| password | STRING | Contraseña hasheada con bcrypt |
| createdAt | DATE | Fecha de creación |

### Tabla `progress`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | INTEGER (PK) | ID autoincremental |
| userId | STRING (FK) | Referencia a users.id |
| dayKey | STRING | Clave del día (YYYY-MM-DD) |
| status | STRING | Estado: 'completed', 'locked', '' |
| updatedAt | DATE | Última actualización |

Índice único: `(userId, dayKey)` para evitar duplicados.

## 🔧 Comandos Útiles

### Verificar conexión
```bash
curl http://localhost:3000/api/health
```

Response esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-...",
  "environment": "development",
  "database": "connected"
}
```

### Resetear base de datos (desarrollo)
En modo desarrollo, las tablas se sincronizan automáticamente al iniciar.

Para borrar todos los datos:
```sql
-- Conectarse a la DB
psql -U postgres -d motivation_calendar

-- Truncar tablas
TRUNCATE TABLE progress CASCADE;
TRUNCATE TABLE users CASCADE;
```

## 🐛 Solución de Problemas

### Error: "ECONNREFUSED"
PostgreSQL no está corriendo. Iniciarlo:
```bash
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS
```

### Error: "database does not exist"
Crear la base de datos (ver paso 4).

### Error: "password authentication failed"
Verificar que `DB_PASSWORD` en `.env` coincida con la contraseña del usuario PostgreSQL.

### Error: "port 5432 already in use"
Otro proceso está usando el puerto. Cambiar `DB_PORT` en `.env` y reiniciar PostgreSQL.

## 🔄 Migraciones Futuras

Cuando necesites hacer cambios en el esquema:

1. Editar los modelos en `backend/models/database.js`
2. En desarrollo: las tablas se actualizan automáticamente (`alter: true`)
3. En producción: crear migraciones manuales con Sequelize CLI

## 📝 Notas Importantes

- **En producción**: Siempre usa `NODE_ENV=production` y configura un `JWT_SECRET` seguro
- **Backups**: Configura backups automáticos de tu base de datos PostgreSQL
- **Pool de conexiones**: El pool está configurado con max=5 conexiones. Ajustar según necesidad.
- **Logging**: En producción (`NODE_ENV=production`), los logs de SQL se desactivan automáticamente
