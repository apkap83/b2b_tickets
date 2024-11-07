# Use My Base Image
FROM my-monorepo-base AS base

# Set the working directory
WORKDIR /app

# Copy the entire monorepo (adjust the path as needed)
COPY ../../ .

# Install dependencies
# RUN npm install -g pnpm@9.12.0

# Set environment variable to disable TLS certificate validation
# RUN pnpm config set strict-ssl false
# RUN pnpm config set proxy http://10.10.18.123:3129
# RUN pnpm config set https-proxy http://10.10.18.123:3129

# RUN pnpm ci || cat /app/.npm/_logs/*
RUN pnpm install --frozen-lockfile || cat /app/.npm/_logs/*

# Build the NMS_Portal project using nx
RUN nx reset

# Expose the port the app runs on
EXPOSE 3000
