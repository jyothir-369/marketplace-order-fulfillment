# ============================================
# Multi-stage Dockerfile for NestJS Backend
# Builds from monorepo root (context: ../..)
# ============================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Copy root workspace manifests
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install all workspace dependencies (needed for the build)
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY tsconfig.json ./tsconfig.json 2>/dev/null || true

# Reuse installed dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy backend source
COPY apps/backend ./apps/backend

# Build the backend
RUN npm run build --workspace=@marketplace/backend

# Stage 3: Runtime
FROM node:20-alpine AS runtime

# Install OpenSSL for Node.js crypto
RUN apk add --no-cache openssl ca-certificates tzdata

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install production-only dependencies
RUN npm ci --omit=dev --workspace=@marketplace/backend && \\
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/apps/backend/dist ./dist

# Set ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]