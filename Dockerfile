# Multi-stage build for production

# Stage 1: Build API
FROM node:18-alpine AS api-builder
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy API package files
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm install

# Copy API source
COPY apps/api ./apps/api

# Generate Prisma Client
RUN cd apps/api && npx prisma generate

# Build API
RUN npm run build --workspace=api

# Stage 2: Build Web
FROM node:18-alpine AS web-builder
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy Web package files
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm install

# Copy Web source
COPY apps/web ./apps/web

# Build Web
RUN npm run build --workspace=web

# Stage 3: API Production
FROM node:18-alpine AS api
WORKDIR /app

# Copy package files
COPY --from=api-builder /app/package*.json ./
COPY --from=api-builder /app/apps/api/package*.json ./apps/api/

# Install production dependencies only
RUN npm install --production --workspace=api

# Copy built API
COPY --from=api-builder /app/apps/api/dist ./apps/api/dist
COPY --from=api-builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=api-builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose API port
EXPOSE 4000

# Start API
CMD ["node", "apps/api/dist/main.js"]

# Stage 4: Web Production
FROM node:18-alpine AS web
WORKDIR /app

# Copy package files
COPY --from=web-builder /app/package*.json ./
COPY --from=web-builder /app/apps/web/package*.json ./apps/web/

# Install production dependencies only
RUN npm install --production --workspace=web

# Copy built Web app
COPY --from=web-builder /app/apps/web/.next ./apps/web/.next
COPY --from=web-builder /app/apps/web/public ./apps/web/public
COPY --from=web-builder /app/apps/web/next.config.js ./apps/web/

# Expose Web port
EXPOSE 3000

# Start Web
CMD ["npm", "start", "--workspace=web"]
