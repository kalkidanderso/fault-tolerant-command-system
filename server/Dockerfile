# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root configuration
COPY package.json tsconfig.json ./
COPY server/package.json server/tsconfig.json ./server/

# Install dependencies (only what's needed for build)
RUN npm install
# We need to install workspace dependencies properly. 
# Since we are isolating the build, we can just install in root mostly or link them via workspaces.
# Simplified approach for Docker: install all deps in root for the workspace

# Copy source code
COPY server/src ./server/src
COPY server/tsconfig.json ./server/

# Build
WORKDIR /app/server
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json ./
COPY server/package.json ./server/
RUN npm install --omit=dev --workspace=server

# Copy built code
COPY --from=builder /app/server/dist ./dist

# Create data directory for SQLite
RUN mkdir -p data
VOLUME /app/data

# Environment
ENV NODE_ENV=production
ENV SERVER_PORT=3000
ENV DATABASE_PATH=/app/data/commands.db

EXPOSE 3000

CMD ["node", "dist/index.js"]
