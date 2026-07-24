# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy only API package files
COPY apps/api/package*.json ./

# Install dependencies
RUN npm install

# Copy API source code
COPY apps/api ./

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "dist/main.js"]
