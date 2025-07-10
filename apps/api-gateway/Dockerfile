FROM node:20-alpine

WORKDIR /app

COPY ../../package*.json ./
COPY . .

# Instala TODAS las dependencias (incluye nest CLI)
RUN npm install

# Compila el código TypeScript
RUN npm run build

# Elimina dependencias de desarrollo para producción (opcional)
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "run", "start:prod:api-gateway"]