# =============================================================================
# Frontend Dockerfile — React ERP UI (multi-stage build)
# =============================================================================
#
# Stage 1 (builder): Installs dependencies and produces an optimised
#   production build of the React app in /app/build.
#
# Stage 2 (serve):   Copies the static build into an nginx image.
#   nginx serves the files and proxies /api/* to the backend container.
#   See nginx.conf for routing rules.
#
# Why multi-stage: the final image contains only nginx + static files (~25MB).
# The node_modules and build toolchain from Stage 1 are discarded, so the
# production image is small and has no unnecessary attack surface.
#
# Port: 80
# =============================================================================

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies first (separate layer — only re-runs when package.json changes)
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:alpine

# Copy compiled React app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Replace default nginx config with our custom one (SPA routing + API proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
