# Trellis API server image (Fastify + product loader CLI)
#
# Build from the repo root:
#   docker build -f deploy/server.Dockerfile -t trellis-server .
#
# The container loads a product definition into the database and serves the
# API. Override PRODUCT_FILE to deploy a different product.

FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app

# Install dependencies first (cached while sources change)
# tsconfig.base.json is the extends target for every package's tsconfig
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/kernel/package.json packages/kernel/
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN pnpm install --frozen-lockfile

# Build the server and its workspace dependencies
COPY packages ./packages
RUN pnpm --filter "@trellis/server..." run build

FROM node:20-alpine
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV PRODUCT_FILE=/app/products/kitchen-sink/product.yaml

# Copy the built workspace (preserves pnpm's node_modules symlink layout)
COPY --from=build /app /app
COPY products /app/products

EXPOSE 3000
# --host 0.0.0.0: the CLI defaults to localhost, which is unreachable from
# outside the container.
# --force: container restarts must reload product schemas idempotently.
CMD ["sh", "-c", "node packages/server/dist/main.js serve \"$PRODUCT_FILE\" --port \"$PORT\" --host 0.0.0.0 --force"]
