# syntax=docker/dockerfile:1

# ============================ Builder stage ============================
# Installs production dependencies. Includes build tools so native modules
# (better-sqlite3) can compile if no prebuilt binary matches the platform.
FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ============================ Runtime stage ===========================
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_FILE=data/zenmotion.db
WORKDIR /app

# Persisted SQLite lives here; owned by the unprivileged `node` user.
RUN mkdir -p /app/data && chown -R node:node /app

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

USER node
EXPOSE 4000

# Uses Node's built-in fetch (Node 20) — no extra packages needed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
