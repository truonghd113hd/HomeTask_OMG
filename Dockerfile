# ── Stage 1: Build the React frontend ────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies needed by react-scripts)
COPY package*.json ./
RUN npm ci

# Copy source and build the static frontend bundle
COPY . .
RUN npm run build

# ── Stage 2: Production API server ────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only (no devDependencies).
# `--ignore-scripts` skips the `prepare` lifecycle (husky install), which would
# otherwise fail here because husky is a devDependency and is not installed.
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy backend source
COPY config/       ./config/
COPY controllers/  ./controllers/
COPY middleware/   ./middleware/
COPY models/       ./models/
COPY routes/       ./routes/
COPY services/     ./services/
COPY utils/        ./utils/
COPY server.js     ./server.js

# Copy the built React bundle from the builder stage
COPY --from=builder /app/build ./build

# ── Runtime configuration ─────────────────────────────────────────────────────
# All values can be overridden at runtime via -e / --env-file.
ENV NODE_ENV=production \
    PORT=3002 \
    CORS_ORIGIN=http://localhost:3000 \
    BLOCKCHAIN_DIFFICULTY=2 \
    BLOCKCHAIN_MINING_REWARD=100 \
    BLOCKCHAIN_PERSISTENCE=true \
    BLOCKCHAIN_DATA_FILE=/app/data/blockchain.json \
    SEED_DEMO_DATA=true \
    FEE_AMOUNT=100 \
    FEE_PERCENTAGE=2.5

# Persist blockchain state to a named volume so it survives container restarts.
# Mount with: docker run -v blockchain_data:/app/data ...
VOLUME ["/app/data"]

EXPOSE 3002

# Lightweight health probe — curl is available in node:alpine
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "server.js"]
