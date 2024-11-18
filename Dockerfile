# Use an official Node.js runtime as a parent image
FROM node:20 AS base

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

# Set environment variables for apk proxy
ENV HTTP_PROXY=http://10.124.49.151:3129
ENV HTTPS_PROXY=http://10.124.49.151:3129
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# Set the SHELL environment variable to bash or sh
ENV SHELL=/bin/sh

# Add centos user with the same UID and GID as the host's centos user
RUN addgroup --gid 1001 centos && \
    adduser --uid 1001 --gid 1001 --home /home/centos --shell /bin/sh --disabled-password centos

# Set the home directory for centos
ENV HOME=/home/centos

# Create necessary directories with correct permissions for centos
RUN mkdir -p /app/env-files && \
    mkdir -p /home/centos/.pnpm-global && \
    chown -R centos:centos /app /home/centos/.pnpm-global /home/centos/.npmrc && \
    chmod g+s /home/centos # Use a Sticky Group Permission: To automatically enforce ownership for new files and directories created under /home/centos, you can use a sticky group permission

# Set the working directory
WORKDIR /app

# Copy the proxy certificate to the image
COPY Nova_Root_Certificate.crt  /usr/local/share/ca-certificates/Nova_Root_Certificate.crt
RUN chmod 644 /usr/local/share/ca-certificates/Nova_Root_Certificate.crt
RUN update-ca-certificates

# Update CA certificates
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/Nova_Root_Certificate.crt

# Set the PNPM_HOME environment variable manually
ENV PNPM_HOME=/home/centos/.pnpm-global
ENV PATH=$PNPM_HOME:$PATH

# Add proxy for NPM
RUN npm config set strict-ssl false --global
RUN npm config set proxy http://10.124.49.151:3129
RUN npm config set https-proxy http://10.124.49.151:3129

# Install pnpm package manager
RUN npm install -g pnpm@9.12.0

# Set environment variable to disable TLS certificate validation
RUN pnpm config set strict-ssl false --global
RUN pnpm config set proxy http://10.124.49.151:3129
RUN pnpm config set https-proxy http://10.124.49.151:3129

# Inst env-cmd globally
RUN pnpm i -g env-cmd

# Install Nx
RUN pnpm install -g nx@19.2.2


