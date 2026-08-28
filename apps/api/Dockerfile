# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# base: shared starting point for every stage below.
# ---------------------------------------------------------------------------
FROM oven/bun:1.3-alpine AS base
WORKDIR /app

# ---------------------------------------------------------------------------
# pruner: cut the monorepo down to only what @bismo/api needs to build/run
# (its own source plus the workspace packages it actually imports).
# ---------------------------------------------------------------------------
FROM base AS pruner
COPY . .
RUN bunx turbo prune @bismo/api --docker

# ---------------------------------------------------------------------------
# installer: install deps from the pruned lockfile/manifests only. This layer
# is cache-keyed on dependency manifests alone, so editing source later never
# invalidates it.
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
# dev: run the API from source, restarting on change. Intended to be used
# with the app's source bind-mounted over this image (see
# docker-compose.dev.yml). Uses nodemon in polling mode rather than Bun's own
# --watch: Bun's native fs-event watcher never fires for edits made from the
# host side of a Docker Desktop (Windows/WSL2) bind mount, since those don't
# propagate inotify events into the container — only polling reliably sees
# them.
# ---------------------------------------------------------------------------
FROM source AS dev
WORKDIR /app/apps/api
EXPOSE 5500
CMD ["bun", "run", "dev:docker"]

# ---------------------------------------------------------------------------
# builder: bundle the API into a single production file.
# ---------------------------------------------------------------------------
FROM source AS builder
WORKDIR /app/apps/api
RUN bun run build

# ---------------------------------------------------------------------------
# production: minimal runtime — the built bundle plus installed deps only,
# no TypeScript sources, no dev tooling.
# ---------------------------------------------------------------------------
FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app /app
WORKDIR /app/apps/api
EXPOSE 5500
CMD ["bun", "run", "start"]
