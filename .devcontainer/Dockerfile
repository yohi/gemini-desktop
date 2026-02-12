FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Install Electron dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    libgbm1 \
    libxss1 \
    xvfb \
    libdrm2 \
    libxshmfence1 \
    libglu1 \
    git \
    curl \
    ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
