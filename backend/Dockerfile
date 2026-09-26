# Build stage: compila el backend TypeScript
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY backend/ ./backend/
RUN npm run build

# Runtime: solo dependencias de producción + artefacto compilado
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/backend/dist ./backend/dist
COPY frontend/ ./frontend/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "backend/dist/server.js"]
