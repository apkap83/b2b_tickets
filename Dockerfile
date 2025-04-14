# Use an official Node.js runtime as a parent image
FROM node:20 AS base

ARG USE_PROXY=true
ARG HTTP_PROXY=http://10.124.49.151:3129
ARG HTTPS_PROXY=http://10.124.49.151:3129

ENV SHELL=/bin/sh \
    HOME=/home/centos \
    PNPM_HOME=/home/centos/.pnpm-global \
    NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/Nova_Root_Certificate.crt

ENV PATH=$PNPM_HOME:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Ensure PATH includes PNPM_HOME during build and runtime
RUN export PATH=$PNPM_HOME:$PATH && \
    echo "export PATH=$PNPM_HOME:$PATH" >> /etc/profile

# Add centos user with the same UID and GID as the host's centos user
RUN addgroup --gid 1001 centos && \
    adduser --uid 1001 --gid 1001 --home /home/centos --shell /bin/sh --disabled-password centos && \
    mkdir -p /app/env-files /home/centos/.pnpm-global && \
    chown -R centos:centos /app /home/centos/.pnpm-global && \
    chmod g+s /home/centos

# Set the working directory
WORKDIR /app

# Copy and configure custom CA certificate
COPY Nova_Root_Certificate.crt /usr/local/share/ca-certificates/Nova_Root_Certificate.crt
RUN chmod 644 /usr/local/share/ca-certificates/Nova_Root_Certificate.crt && \
    update-ca-certificates

# Configure npm and pnpm with proxy settings
RUN set -x && \
    npm config set strict-ssl false --global && \
    if [ "$USE_PROXY" = "true" ]; then \
      echo "Using proxy settings for npm" && \
      npm config set proxy $HTTP_PROXY && \
      npm config set https-proxy $HTTPS_PROXY; \
    else \
      unset HTTP_PROXY HTTPS_PROXY && \
      echo "Not using proxy settings for npm" ;\
    fi && \
    export PATH=$PNPM_HOME:$PATH && \
    npm install -g pnpm@9.12.0 && \
    pnpm config set strict-ssl false --global && \
    if [ "$USE_PROXY" = "true" ]; then \
      echo "Using proxy settings for pnpm" && \
      pnpm config set proxy $HTTP_PROXY && \
      pnpm config set https-proxy $HTTPS_PROXY; \
    else \
      echo "Not using proxy settings for pnpm" ;\
    fi && \
    pnpm install -g env-cmd nx@19.4.2

# RUN apt-get update && \
#     apt-get install -y dnsutils && \
#     rm -rf /var/lib/apt/lists/*



