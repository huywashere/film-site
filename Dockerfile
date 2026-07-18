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


# Stage 3: API Production (Harden & Secure)
FROM node:18-alpine AS api
ENV NODE_ENV=production
WORKDIR /app

# Pre-create directory and set correct owner
RUN mkdir -p /app && chown -R node:node /app

# Copy package files with correct node ownership
COPY --chown=node:node --from=api-builder /app/package*.json ./
COPY --chown=node:node --from=api-builder /app/apps/api/package*.json ./apps/api/

# Switch to non-privileged user
USER node

# Install production dependencies only
RUN npm install --omit=dev --workspace=api

# Copy built API artifacts
COPY --chown=node:node --from=api-builder /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=api-builder /app/apps/api/prisma ./apps/api/prisma
COPY --chown=node:node --from=api-builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose API port
EXPOSE 4000

# Start API
CMD ["node", "apps/api/dist/main.js"]


# Stage 4: Web Production (Harden & Secure)
FROM node:18-alpine AS web
ENV NODE_ENV=production
WORKDIR /app

# Pre-create directory and set correct owner
RUN mkdir -p /app && chown -R node:node /app

# Copy package files with correct node ownership
COPY --chown=node:node --from=web-builder /app/package*.json ./
COPY --chown=node:node --from=web-builder /app/apps/web/package*.json ./apps/web/

# Switch to non-privileged user
USER node

# Install production dependencies only
RUN npm install --omit=dev --workspace=web

# Copy built Web app artifacts
COPY --chown=node:node --from=web-builder /app/apps/web/.next ./apps/web/.next
COPY --chown=node:node --from=web-builder /app/apps/web/public ./apps/web/public
COPY --chown=node:node --from=web-builder /app/apps/web/next.config.js ./apps/web/

# Expose Web port
EXPOSE 3000

# Start Web
CMD ["npm", "start", "--workspace=web"]
