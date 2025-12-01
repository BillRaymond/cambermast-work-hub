# Multi stage build for Cambermast SvelteKit

########################
# 1. Build stage
########################
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Core project files. Adjust if you add new config files later.
COPY package*.json ./
COPY tsconfig.json svelte.config.js vite.config.ts postcss.config.cjs tailwind.config.ts ./

# Source and static assets
COPY src ./src
COPY static ./static
COPY scripts ./scripts

# Public env values used at build time (for $env/static/public)
# This assumes .env is committed and contains PUBLIC_SITE_ORIGIN
COPY .env ./.env

# Install deps and build
RUN npm ci
RUN npm run build

########################
# 2. Runtime stage
########################
FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Only runtime deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built app from builder
COPY --from=builder /app/build ./build

# Default SvelteKit adapter-node port
ENV PORT=4173
EXPOSE 4173

# Start the Node server produced by @sveltejs/adapter-node
CMD ["node", "build/index.js"]