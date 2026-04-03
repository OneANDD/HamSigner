FROM node:22-slim

# Install build dependencies for zsign compilation + runtime libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    g++ \
    pkg-config \
    libssl-dev \
    libzip-dev \
    libmbedtls-dev \
    unzip \
    zip \
    curl \
    make \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Build zsign from source
RUN git clone --depth=1 https://github.com/zhlynn/zsign /tmp/zsign \
    && cd /tmp/zsign/build/linux \
    && make clean && make \
    && cp /tmp/zsign/bin/zsign /usr/local/bin/zsign \
    && chmod +x /usr/local/bin/zsign \
    && rm -rf /tmp/zsign

# Verify zsign is installed
RUN zsign -v

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install Node.js dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Build the application
RUN pnpm build

# Create directory for IPA signing jobs
RUN mkdir -p /tmp/ipa_signer_jobs

# Set environment variables for production
ENV NODE_ENV=production
ENV ZSIGN_PATH=/usr/local/bin/zsign

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["pnpm", "start"]
