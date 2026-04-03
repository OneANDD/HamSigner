import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  // Use Vite's middleware for handling assets and HMR
  app.use(vite.middlewares);

  // Serve index.html for all non-API routes
  app.get("*", async (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith("/api") || req.path.startsWith("/__manus__")) {
      return next();
    }

    try {
      const clientRoot = path.resolve(import.meta.dirname, "../../", "client");
      const clientTemplate = path.resolve(clientRoot, "index.html");

      console.log(`[setupVite] GET ${req.path} -> serving index.html`);

      // Read and transform the template
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      console.error(`[setupVite] Error serving page for ${req.path}:`, e);
      res.status(500).send("Error loading application");
    }
  });
}

export function serveStatic(app: Express) {
  // Try multiple possible dist paths
  const possiblePaths = [
    path.resolve(import.meta.dirname, "../", "dist", "public"),
    path.resolve(import.meta.dirname, "../", "dist"),
  ];

  let distPath: string | null = null;
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      distPath = p;
      break;
    }
  }

  if (!distPath) {
    console.error("[serveStatic] Could not find dist directory");
    app.use("*", (_req, res) => {
      res.status(500).send("Build files not found");
    });
    return;
  }

  const indexPath = path.resolve(distPath, "index.html");
  
  // Serve static files
  app.use(express.static(distPath));

  // Fallback to index.html for all other routes (SPA routing)
  app.get("*", (_req, res) => {
    res.sendFile(indexPath);
  });
}
