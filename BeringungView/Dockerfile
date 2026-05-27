############################
# 1) Builder Stage
############################
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and configuration files
COPY . .

# Build the Angular application for production
RUN npm run build

############################
# 2) Runtime Stage (Nginx)
############################
FROM nginx:1.27-alpine AS runtime

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built Angular app from builder stage
# Angular outputs to dist/tradingcardgamesite/browser by default
COPY --from=builder /app/dist/BeringungView/browser /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ || exit 1

# Nginx starts automatically
