############################
# 1) Builder Stage
############################
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack (Node 22 recommended way)
RUN corepack enable

# Copy dependency definitions first (better caching)
COPY package.json pnpm-lock.yaml ./

# Install dependencies with pnpm
RUN corepack enable \
 && pnpm install --frozen-lockfile --approve-builds

# Copy full project
COPY . .

# Build Angular app
RUN pnpm run build

############################
# 2) Runtime Stage (Nginx)
############################
FROM nginx:1.27-alpine AS runtime

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy Angular build output
# IMPORTANT: path must match angular.json "outputPath"
COPY --from=builder /app/dist/BeringungView/browser /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://127.0.0.1/ || exit 1
