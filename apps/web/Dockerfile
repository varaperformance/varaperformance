FROM node:22.22.2-alpine AS build
WORKDIR /app

RUN apk add --no-cache autoconf automake libtool gcc g++ make zlib-dev nasm

RUN npm install -g pnpm@11

COPY pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY pnpm-lock.yaml ./pnpm-lock.yaml
COPY package.json ./package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/core/package.json ./packages/core/package.json

RUN pnpm install --frozen-lockfile

COPY . .

WORKDIR /app/apps/web

ARG VITE_API_ORIGIN=https://varaperformance.com
ARG VITE_API_VERSION=v1
ARG VITE_API_BASE_URL=https://varaperformance.com/v1/
ARG VITE_MESSAGING_SOCKET_URL=https://varaperformance.com/messaging
ARG VITE_NOTIFICATION_SOCKET_URL=https://varaperformance.com/notifications
ARG VITE_API_PROXY_TARGET=https://varaperformance.com
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_APPLE_CLIENT_ID=com.varaperformance.web
ARG VITE_APPLE_REDIRECT_URI=https://varaperformance.com/auth/apple/callback
ARG VITE_APPLE_SCOPE=name\ email
ARG VITE_MAPBOX_ACCESS_TOKEN=

ENV VITE_API_ORIGIN=${VITE_API_ORIGIN}
ENV VITE_API_VERSION=${VITE_API_VERSION}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_MESSAGING_SOCKET_URL=${VITE_MESSAGING_SOCKET_URL}
ENV VITE_NOTIFICATION_SOCKET_URL=${VITE_NOTIFICATION_SOCKET_URL}
ENV VITE_API_PROXY_TARGET=${VITE_API_PROXY_TARGET}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_APPLE_CLIENT_ID=${VITE_APPLE_CLIENT_ID}
ENV VITE_APPLE_REDIRECT_URI=${VITE_APPLE_REDIRECT_URI}
ENV VITE_APPLE_SCOPE=${VITE_APPLE_SCOPE}
ENV VITE_MAPBOX_ACCESS_TOKEN=${VITE_MAPBOX_ACCESS_TOKEN}

RUN pnpm --filter @varaperformance/core build
RUN pnpm --filter @varaperformance/web build

FROM nginxinc/nginx-unprivileged:1.27.5-alpine AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4173/ || exit 1
