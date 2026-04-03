FROM node:22-slim

# Install runtime dependencies including CA certificates for HTTPS
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl-dev \
    libzip-dev \
    libmbedtls-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Download pre-built zsign binary from GitHub releases
# Using the Linux x86_64 binary
RUN curl -L https://github.com/zhlynn/zsign/releases/download/v1.1.2/zsign_linux_amd64 -o /usr/local/bin/zsign \
    && chmod +x /usr/local/bin/zsign \
    && zsign -v

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
