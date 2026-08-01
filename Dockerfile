# Multi-stage Dockerfile for Go-Chat on Render
# Stage 1: Build the React/Vite Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: PocketBase Backend + Static File Server
FROM alpine:latest

# Install dependencies needed for PocketBase
RUN apk add --no-cache ca-certificates wget unzip bash

WORKDIR /app

# Download PocketBase AMD64 for Linux
ENV PB_VERSION=0.22.14
# Update to newer version when LibSQL/Turso native support lands in pre-built binary
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x pocketbase

# Copy built static frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy schema, migrations, and hooks
COPY pb_schema.json ./
COPY scripts/ ./scripts/
COPY pb_migrations/ ./pb_migrations/
# PocketBase JS hooks (cron cleanup, custom routes)
COPY pb_hooks/ ./pb_hooks/

# Expose port (Render automatically sets PORT env var)
EXPOSE 10000

# Start PocketBase serving both API and static frontend from ./dist
CMD ["sh", "-c", "./pocketbase serve --http=0.0.0.0:${PORT:-10000} --dir=./pb_data --publicDir=./dist"]
