FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache autoconf automake libtool gcc g++ make nasm zlib-dev python3
RUN npm install -g pnpm@11

# Copy ALL workspace package.json files so pnpm resolves the full workspace graph
COPY .npmrc pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/core/package.json ./packages/core/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /app

COPY . .

RUN pnpm --filter @varaperformance/core build
RUN pnpm --filter @varaperformance/worker build

# pnpm deploy creates a self-contained flat node_modules with all prod deps —
# avoids the split-hoist problem where some packages land in package-level node_modules
RUN pnpm --filter @varaperformance/worker deploy --legacy --prod /deploy/worker

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Flat, fully-resolved prod node_modules (no symlink/hoisting issues)
COPY --from=build /deploy/worker/node_modules ./node_modules
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/apps/worker/libs/common/src/mailer/templates ./apps/worker/libs/common/src/mailer/templates
COPY --from=build /app/apps/worker/src/generated ./apps/worker/src/generated
COPY --from=build /app/packages/core/dist ./packages/core/dist

RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app

USER app
WORKDIR /app/apps/worker

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

CMD ["node", "dist/src/main.js"]
