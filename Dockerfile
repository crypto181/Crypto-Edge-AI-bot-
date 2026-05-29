# ==============================================================================
# STAGE 1: Build Phase
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies including devDependencies (needed for compiling Vite and bundling TypeScript server)
RUN npm ci

# Copy all codebase files
COPY . .

# Run the unified build command:
# 1. Compiles Vite single-page application into dist/
# 2. Bundles/CJS-compiles server.ts into dist/server.cjs utilizing esbuild
RUN npm run build

# ==============================================================================
# STAGE 2: Secure Production Runtime
# ==============================================================================
FROM node:20-alpine

WORKDIR /app

# Safe production settings
ENV NODE_ENV=production

# Copy only compiled compiled client and server artifacts from the build phase
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
# Safely copy Firebase applet config if generated in the builder environment
COPY --from=builder /app/firebase-applet-config.json* ./

# Install strictly production dependencies to reduce disk space and attack surface
RUN npm ci --omit=dev

# Expose port 3000 for standard inbound routing
EXPOSE 3000

# Start modern bundled node server
CMD ["node", "dist/server.cjs"]
