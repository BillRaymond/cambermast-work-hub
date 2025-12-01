# -----------------------------
# Builder stage
# -----------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install dependencies, including devDependencies, so SvelteKit CLI is available
COPY package*.json ./
RUN NODE_ENV=development npm ci

# Copy the rest of the app source
COPY . .

# Public env values used at build time (for $env/static/public)
# This assumes .env (in the repo root) contains PUBLIC_SITE_ORIGIN only.
# If you ever add secrets, put them in a different file that is NOT copied.
RUN test -f .env || echo "PUBLIC_SITE_ORIGIN=https://w.cambermast.com" > .env

# Ensure SvelteKit generates .svelte-kit and tsconfig metadata
RUN npx svelte-kit sync

# Build the SvelteKit app using adapter-node
RUN npm run build

# -----------------------------
# Runtime stage
# -----------------------------
FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Copy only what we need to run
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/build ./build

# Install production dependencies only, without running prepare scripts
RUN npm ci --omit=dev --ignore-scripts

# App listens on PORT (default 4173)
ENV PORT=4173

EXPOSE 4173

CMD ["node", "build/index.js"]
