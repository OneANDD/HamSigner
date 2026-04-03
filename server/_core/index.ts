import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import fs from "fs";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import signRoute from "../signRoute";
import certRoutes from "../certRoutes";
import { startCleanupSchedule } from "../cleanupService";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // CORS middleware - allow requests from Vercel and localhost
  app.use((req, res, next) => {
    const origin = req.headers.origin || "";
    const allowedOrigins = [
      "https://hamsign.vercel.app",
      "http://localhost:3000",
      "http://localhost:5173",
      "https://ipasigner-ghsfrzbn.manus.space",
    ];
    
    if (allowedOrigins.includes(origin) || origin.includes("localhost")) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  
  // Log all requests
  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    next();
  });
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", message: "HamSigner running" });
  });
  
  // Root path - serve the app immediately before any other middleware
  app.get("/", async (_req, res) => {
    try {
      const clientTemplate = path.resolve(import.meta.dirname, "../../", "client", "index.html");
      const html = await fs.promises.readFile(clientTemplate, "utf-8");
      res.set("Content-Type", "text/html").send(html);
    } catch (e) {
      console.error("[root] Error:", e);
      res.status(500).send("Error loading app");
    }
  });
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // IPA signing REST endpoints (multipart, not tRPC)
  app.use("/api", signRoute);
  // Certificate checking and password changing endpoints
  app.use("/api", certRoutes);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  
  // Always use Vite for serving frontend (development and production)
  // This ensures files are served dynamically without build issues
  await setupVite(app, server);

  // Start the cleanup schedule for expired files
  startCleanupSchedule();

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
