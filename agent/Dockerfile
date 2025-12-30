# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root configuration and package files
COPY package.json tsconfig.json ./
COPY agent/package.json agent/tsconfig.json ./agent/

# Install dependencies
RUN npm install

# Copy source code
COPY agent/src ./agent/src

# Build
WORKDIR /app/agent
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies
COPY package.json ./
COPY agent/package.json ./agent/
RUN npm install --omit=dev --workspace=agent

# Copy built code
COPY --from=builder /app/agent/dist ./dist

# Environment
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
