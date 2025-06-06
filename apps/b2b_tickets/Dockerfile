# Use My Base Image
FROM my-monorepo-base AS base

# Set the working directory
WORKDIR /app

# Copy the entire monorepo (adjust the path as needed)
COPY ../../ .

# RUN pnpm ci || cat /app/.npm/_logs/*
RUN pnpm install --frozen-lockfile || cat /app/.npm/_logs/*

# Run only safe tests that don't need browsers or external services
RUN chmod +x ./scripts/run-all-tests.sh ./scripts/run-all-unit-tests.sh
RUN pnpm run test:safe

# Build the NMS_Portal project using nx
RUN nx reset

# Set Permisssions to Centos for /app dir
RUN chown -R centos:centos /app /home/centos/

# Unset Proxy Settings
# RUN unset HTTP_PROXY && unset HTTPS_PROXY

# Switch to centos user
USER centos

# Expose the port the app runs on
EXPOSE 3000
