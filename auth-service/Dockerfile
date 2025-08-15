# Multi-stage Docker build for production deployment
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy package files and install all dependencies (including devDependencies)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .
COPY .env.example .env

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run the application
FROM base AS runner
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 authuser

# Copy built application
COPY --from=builder --chown=authuser:nodejs /app/dist ./dist
COPY --from=builder --chown=authuser:nodejs /app/public ./public
COPY --from=builder --chown=authuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=authuser:nodejs /app/package.json ./package.json
COPY --from=builder --chown=authuser:nodejs /app/prisma ./prisma

# Copy production dependencies
COPY --from=deps --chown=authuser:nodejs /app/node_modules ./node_modules

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads
RUN chown -R authuser:nodejs /app/logs /app/uploads

# Switch to non-root user
USER authuser

# Expose port
EXPOSE 3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]