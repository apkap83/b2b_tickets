# Use My Base Image
FROM my-monorepo-base AS base

# Set the working directory
WORKDIR /app

# Copy the entire monorepo (adjust the path as needed)
COPY ../../ .

# RUN pnpm ci || cat /app/.npm/_logs/*
RUN pnpm install --frozen-lockfile || cat /app/.npm/_logs/*

# Build the NMS_Portal project using nx
RUN nx reset

# Set Permisssions to Centos for /app dir
RUN chown -R centos:centos /app /home/centos/.npmrc

# Switch to centos user
USER centos

# Expose the port the app runs on
EXPOSE 3000
