############################
# 1) Builder Stage
############################
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm (Corepack)
RUN corepack enable

# Copy dependency files first (cache-friendly)
COPY package.json pnpm-lock.yaml ./

# Install dependencies (pnpm 11 safe)
RUN corepack enable \
 && pnpm config set ignore-scripts false \
 && pnpm install --frozen-lockfile --force

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
COPY --from=builder /app/dist/BeringungView/browser /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://127.0.0.1/ || exit 1
