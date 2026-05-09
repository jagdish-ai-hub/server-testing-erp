# =============================================================================
# Backend Dockerfile — Node.js ERP API
# =============================================================================
# Single-stage build. Copies source into the image and runs it with Node.
#
# Port:    5000 (set via PORT env var in docker-compose.yml)
# Start:   node server.js
#
# On startup the server connects to PostgreSQL, runs any pending migrations,
# and seeds the default admin user if not already present.
# =============================================================================

FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies first (separate layer so Docker cache isn't busted
# on every code change — only re-runs when package.json changes)
COPY package*.json ./
RUN npm install --production

# Copy application source
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
