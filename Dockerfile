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

# Install ca-certificates package
# RUN apk add --no-cache --allow-untrusted --no-check-certificate ca-certificates

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

