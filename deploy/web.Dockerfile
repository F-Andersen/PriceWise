# PriceWise web app (Expo export) served by Caddy, which also proxies /api to the
# API container and gets HTTPS certificates automatically for a real domain.
# Build context: repository root (see docker-compose.yml).

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY mobile/package.json mobile/package-lock.json ./
RUN npm ci
COPY mobile/ ./
# Same origin as the site: the browser calls /api, Caddy forwards it to the API.
ARG EXPO_PUBLIC_API_URL=/api
ARG EXPO_PUBLIC_DEMO_LOGIN=false
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL EXPO_PUBLIC_DEMO_LOGIN=$EXPO_PUBLIC_DEMO_LOGIN
RUN npx expo export --platform web --output-dir dist

FROM caddy:2.8.4-alpine
COPY --from=build /app/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
