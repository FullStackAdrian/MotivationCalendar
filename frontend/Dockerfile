# Build stage: export the Expo web app to static files
FROM node:22-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund

COPY frontend/ ./

# Usa rutas relativas para que nginx pueda hacer de proxy a /api
ENV EXPO_PUBLIC_API_URL=
ENV CI=1
ENV EXPO_NO_TELEMETRY=1
RUN npx expo export --platform web

# Runtime stage: nginx sirviendo el export web estático
FROM nginx:alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
