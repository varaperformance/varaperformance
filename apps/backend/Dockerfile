# Bun end to end: bun install and build on the Bun dev image, run on distroless
# Bun. Bun's own crypto (BoringSSL) is not FIPS validated.
ARG BUN_DEV_IMAGE=ghcr.io/worlddrknss/debian-fipsbase-bun:1.4.2-pqc-dev
ARG BUN_IMAGE=ghcr.io/worlddrknss/debian-fipsbase-bun:1.4.2-pqc

# Workspace manifests and the lockfile only, so installs cache until they change.
FROM ${BUN_DEV_IMAGE} AS manifests
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/core/package.json ./packages/core/package.json

FROM manifests AS build
RUN bun install --frozen-lockfile
COPY . .
RUN bun --bun run --filter @varaperformance/core build
RUN bun --bun run --filter @varaperformance/backend build

# Production dependencies of this app alone, in one hoisted node_modules.
FROM manifests AS prod-deps
RUN bun install --frozen-lockfile --production --filter @varaperformance/backend \
 && mkdir -p apps/backend/node_modules

# libstdc++ for the native addons (argon2, css-inline), collected with its
# copyright file and dpkg record so scanners and SBOMs still see it.
FROM ${BUN_DEV_IMAGE} AS runtime-libs
RUN apt-get update \
 && apt-get install -y --no-install-recommends libstdc++6 \
 && install-packages /rootfs libstdc++6 \
 && rm -rf /var/lib/apt/lists/*

# Distroless: no shell, so files are owned by the pod's user (1001) at copy time.
FROM ${BUN_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=runtime-libs /rootfs/ /
COPY --from=prod-deps --chown=1001:1001 /app/node_modules ./node_modules
COPY --from=prod-deps --chown=1001:1001 /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build --chown=1001:1001 /app/packages/core/package.json ./packages/core/package.json
COPY --from=build --chown=1001:1001 /app/packages/core/dist ./packages/core/dist
COPY --from=build --chown=1001:1001 /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build --chown=1001:1001 /app/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=1001:1001 /app/apps/backend/src/generated ./apps/backend/src/generated
COPY --from=build --chown=1001:1001 /app/apps/backend/libs/common/src/mailer/templates ./apps/backend/libs/common/src/mailer/templates
COPY --from=build --chown=1001:1001 /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=build --chown=1001:1001 /app/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts

USER 1001:1001
WORKDIR /app/apps/backend

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD ["bun", "-e", "const r = await fetch('http://localhost:3000/health').catch(() => null); process.exit(r?.status === 200 ? 0 : 1)"]

CMD ["bun", "dist/main.js"]
