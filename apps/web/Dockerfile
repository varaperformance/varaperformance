# Bun end to end: bun install and vite build on the Bun dev image, served by a
# small Bun static server (server.ts, replacing nginx) on distroless Bun.
ARG BUN_DEV_IMAGE=ghcr.io/worlddrknss/debian-fipsbase-bun:1.4.2-pqc-dev
ARG BUN_IMAGE=ghcr.io/worlddrknss/debian-fipsbase-bun:1.4.2-pqc

FROM ${BUN_DEV_IMAGE} AS build
WORKDIR /app

# Workspace manifests and the lockfile first, so the install caches until they change.
COPY package.json bun.lock bunfig.toml ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/core/package.json ./packages/core/package.json

RUN bun install --frozen-lockfile

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

RUN bun --bun run --filter @varaperformance/core build
RUN bun --bun run build

FROM ${BUN_IMAGE} AS runner
WORKDIR /srv

COPY apps/web/server.ts ./server.ts
COPY --from=build /app/apps/web/dist ./dist

# The pod runs as 101 (formerly nginx-unprivileged's user); files stay root-owned and read-only.
USER 101:101

EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["bun", "-e", "const r = await fetch('http://localhost:4173/').catch(() => null); process.exit(r?.ok ? 0 : 1)"]

CMD ["bun", "server.ts"]
