# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# base: shared starting point for every stage below.
# ---------------------------------------------------------------------------
FROM oven/bun:1.3-alpine AS base
WORKDIR /app

# ---------------------------------------------------------------------------
# pruner: cut the monorepo down to only what @bismo/studio-web needs to build/run.
# ---------------------------------------------------------------------------
FROM base AS pruner
COPY . .
RUN bunx turbo prune @bismo/studio-web --docker

# ---------------------------------------------------------------------------
# installer: install deps from the pruned lockfile/manifests only.
# ---------------------------------------------------------------------------
FROM base AS installer
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# source: installed deps + the actual pruned source on top.
# ---------------------------------------------------------------------------
FROM installer AS source
COPY --from=pruner /app/out/full/ .

# ---------------------------------------------------------------------------
# dev: Vite's own dev server with HMR. --host so it's reachable from outside
# the container. Intended to run with the app's source bind-mounted over this
# image (see docker-compose.dev.yml).
# ---------------------------------------------------------------------------
FROM source AS dev
WORKDIR /app/apps/studio-web
EXPOSE 5175
CMD ["bun", "run", "dev", "--", "--host"]

# ---------------------------------------------------------------------------
# builder: static production build. VITE_API_URL is baked in at build time
# (Vite env vars are compile-time, not runtime) — leave it empty to make the
# app call same-origin relative paths, which nginx below proxies to the API.
# ---------------------------------------------------------------------------
FROM source AS builder
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
WORKDIR /app/apps/studio-web
RUN bun run build

# ---------------------------------------------------------------------------
# production: nginx serving the static build, proxying /api to the API
# service. No Bun runtime needed at all here.
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS production
COPY apps/studio-web/docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/apps/studio-web/dist /usr/share/nginx/html
ENV API_HOST=api \
    API_PORT=5500 \
    WEB_INTERNAL_PORT=80
EXPOSE 80
