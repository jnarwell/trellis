# Trellis client image (static build served by nginx, /api proxied to server)
#
# Build from the repo root:
#   docker build -f deploy/client.Dockerfile -t trellis-client .

FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/kernel/package.json packages/kernel/
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY postcss.config.mjs ./
RUN pnpm --filter "@trellis/kernel" run build \
  && pnpm --filter "@trellis/client" run build:app

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/client/dist-app /usr/share/nginx/html
EXPOSE 80
