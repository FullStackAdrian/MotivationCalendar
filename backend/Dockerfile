# Dockerfile para el backend Node.js
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar el código del backend
COPY backend/ ./backend/

# Exponer el puerto
EXPOSE 3000

# Variable de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar el servidor
CMD ["node", "backend/server.js"]
