# Dockerfile para el frontend estático con servidor web ligero
FROM nginx:alpine

# Copiar los archivos del frontend al directorio de nginx
COPY frontend/ /usr/share/nginx/html/

# Copiar configuración personalizada de nginx (opcional)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Comando por defecto de nginx
CMD ["nginx", "-g", "daemon off;"]
