FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=@marketplace/backend

FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
RUN apk add --no-cache openssl ca-certificates tzdata
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
RUN chown -R nestjs:nodejs /app
USER nestjs
ENV PORT=3001
EXPOSE 3001
CMD ["node", "apps/backend/dist/main.js"]
