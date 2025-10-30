# --- Stage 1: Build the app ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy only package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the project
COPY . .

# Generate Prisma Client (so Nest build finds Role/User types)
RUN npx prisma generate

# Build the NestJS app
RUN npm run build

# --- Stage 2: Run the app ---
FROM node:22-alpine AS runner

WORKDIR /app

# Copy build output and Prisma schema (needed for runtime queries)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "dist/main.js"]
