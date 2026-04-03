# Docker Deployment Guide for IPA Signer

This guide explains how to build and deploy the IPA Signer application using Docker, which includes the `zsign` binary needed for iOS app signing.

## Why Docker?

The IPA Signer requires the `zsign` binary to sign iOS applications. Docker packages your entire application (code, dependencies, and `zsign`) into a single container that works consistently across different environments.

## Prerequisites

- **Docker** installed on your system ([Download Docker](https://www.docker.com/products/docker-desktop))
- **Docker Compose** (included with Docker Desktop)

## Local Development with Docker

### 1. Build and Run Locally

```bash
# Clone or navigate to the project directory
cd /path/to/ipa-signer

# Build the Docker image
docker build -t ipa-signer:latest .

# Run the container
docker run -p 3000:3000 ipa-signer:latest
```

The app will be available at `http://localhost:3000`

### 2. Using Docker Compose (Recommended for Development)

```bash
# Start the application with Docker Compose
docker-compose up

# To rebuild after code changes
docker-compose up --build

# To stop the application
docker-compose down
```

The app will be available at `http://localhost:3000`

## Production Deployment

### Option 1: Deploy to Railway

Railway makes it easy to deploy Docker containers:

1. **Create a Railway account** at [railway.app](https://railway.app)
2. **Connect your GitHub repository** to Railway
3. **Railway will automatically detect the Dockerfile** and deploy it
4. **Set environment variables** in Railway dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `VITE_APP_ID`
   - `OAUTH_SERVER_URL`
   - `VITE_OAUTH_PORTAL_URL`
   - `OWNER_OPEN_ID`
   - `OWNER_NAME`
   - `BUILT_IN_FORGE_API_URL`
   - `BUILT_IN_FORGE_API_KEY`
   - `VITE_FRONTEND_FORGE_API_KEY`
   - `VITE_FRONTEND_FORGE_API_URL`

5. **Deploy** — Railway will build and deploy automatically

### Option 2: Deploy to Render

Render also supports Docker deployments:

1. **Create a Render account** at [render.com](https://render.com)
2. **Create a new Web Service**
3. **Connect your GitHub repository**
4. **Select "Docker"** as the runtime
5. **Set the same environment variables** as above
6. **Deploy**

### Option 3: Deploy to AWS (ECS)

For AWS deployment:

1. **Push image to Amazon ECR:**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
   docker tag ipa-signer:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/ipa-signer:latest
   docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/ipa-signer:latest
   ```

2. **Create ECS task definition** using the image URL
3. **Launch ECS service** with the task definition

### Option 4: Deploy to Docker Hub + Any Cloud

1. **Create Docker Hub account** at [hub.docker.com](https://hub.docker.com)
2. **Push your image:**
   ```bash
   docker tag ipa-signer:latest yourusername/ipa-signer:latest
   docker push yourusername/ipa-signer:latest
   ```

3. **Deploy to any cloud provider** that supports Docker (Heroku, DigitalOcean, etc.)

## Docker Image Details

### What's Included

- **Node.js 22** runtime
- **Build tools** (git, g++, pkg-config, libssl-dev, etc.)
- **zsign binary** compiled from source
- **Your application code** and dependencies
- **Health check** endpoint for monitoring

### Image Size

Approximately 1.2-1.5 GB (includes Node.js, build tools, and zsign)

### Exposed Port

- **3000** — Application port

## Environment Variables

All environment variables from your `.env` file should be set in your deployment platform:

```
NODE_ENV=production
DATABASE_URL=<your-database-url>
JWT_SECRET=<your-jwt-secret>
VITE_APP_ID=<your-app-id>
OAUTH_SERVER_URL=<your-oauth-url>
VITE_OAUTH_PORTAL_URL=<your-oauth-portal>
OWNER_OPEN_ID=<owner-id>
OWNER_NAME=<owner-name>
BUILT_IN_FORGE_API_URL=<forge-api-url>
BUILT_IN_FORGE_API_KEY=<forge-api-key>
VITE_FRONTEND_FORGE_API_KEY=<frontend-forge-key>
VITE_FRONTEND_FORGE_API_URL=<frontend-forge-url>
```

## Troubleshooting

### Build fails with "zsign compilation error"

**Solution:** Ensure you have at least 2GB of free disk space and 2GB of RAM available during build.

### Container exits immediately

**Solution:** Check logs with:
```bash
docker logs <container-id>
```

### Port 3000 already in use

**Solution:** Use a different port:
```bash
docker run -p 8080:3000 ipa-signer:latest
```

Then access the app at `http://localhost:8080`

### zsign not found in container

**Solution:** The Dockerfile builds zsign from source. If this fails, check:
1. Internet connectivity during build
2. Sufficient disk space
3. Build logs for compilation errors

## Verification

To verify zsign is working in your container:

```bash
docker run ipa-signer:latest zsign -v
```

You should see the zsign version output.

## Performance Notes

- **First build:** 10-15 minutes (includes zsign compilation)
- **Subsequent builds:** 2-3 minutes (uses Docker layer caching)
- **Container startup:** 5-10 seconds
- **IPA signing:** 30 seconds - 2 minutes (depends on IPA size)

## Next Steps

1. **Test locally** with `docker-compose up`
2. **Choose a deployment platform** (Railway, Render, AWS, etc.)
3. **Set environment variables** in your deployment platform
4. **Deploy** and monitor logs
5. **Test signing** with a sample IPA file

## Support

For Docker-related issues, refer to:
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Railway Documentation](https://docs.railway.app/)
- [Render Documentation](https://render.com/docs)

## License

This Docker setup is provided as part of the IPA Signer project.
