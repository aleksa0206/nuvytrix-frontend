# Stage 1: build the Angular application
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: serve the static files with nginx, which also proxies /api to the backend
FROM nginx:1.29-alpine AS production

# Files in /etc/nginx/templates are rendered with envsubst at startup (API_UPSTREAM, REAL_IP_FROM).
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/nuvytrix-frontend/browser /usr/share/nginx/html

ENV API_UPSTREAM=127.0.0.1:4000 \
  REAL_IP_FROM=127.0.0.1
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
