# Use Debian Slim (Bookworm) - Compatible with pre-built binaries
FROM node:22-bookworm-slim

# Set environment to force binary download and skip heavy local builds
ENV MEDIASOUP_FORCE_WORKER_PREBUILT_DOWNLOAD=true

# 1. Install dependencies required for Mediasoup (C++ compilation)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    net-tools \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Copy package files first (Optimization: caches layers if package.json doesn't change)
COPY package*.json ./

# 3. Clean Install (Faster & cleaner than npm install)
# This compiles Mediasoup C++ bindings. This step takes time!
RUN npm ci

# 4. Copy the rest of the source code
COPY . .

# 5. BUILD STEP (The missing piece!)
# This compiles TypeScript -> JavaScript into the 'dist' folder
RUN npm run build

# --- PRODUCTION ENTRYPOINT ---
# By default, run the compiled JS (Production Mode)
CMD ["node", "dist/main.js"]