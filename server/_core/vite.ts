import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
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

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Try multiple possible dist paths
  const possiblePaths = [
    path.resolve(import.meta.dirname, "../", "dist", "public"),
    path.resolve(import.meta.dirname, "../", "dist"),
    path.resolve(import.meta.dirname, "../../", "dist", "public"),
    path.resolve(import.meta.dirname, "../../", "dist"),
  ];

  let distPath: string | null = null;
  
  console.log("[serveStatic] Searching for dist directory...");
  for (const p of possiblePaths) {
    console.log(`[serveStatic] Checking: ${p}`);
    if (fs.existsSync(p)) {
      console.log(`[serveStatic] Found dist at: ${p}`);
      distPath = p;
      break;
    }
  }

  if (!distPath) {
    console.error("[serveStatic] Could not find dist directory in any of these locations:");
    possiblePaths.forEach(p => console.error(`  - ${p}`));
    console.error("[serveStatic] Falling back to serving error page");
    
    app.use("*", (_req, res) => {
      res.status(500).send(`
        <html>
          <body style="font-family: Arial; padding: 20px;">
            <h1>Build Error</h1>
            <p>The application build files could not be found. Please check the deployment logs.</p>
            <p>Expected dist directory at one of these locations:</p>
            <ul>
              ${possiblePaths.map(p => `<li>${p}</li>`).join("")}
            </ul>
          </body>
        </html>
      `);
    });
    return;
  }

  // Check if index.html exists
  const indexPath = path.resolve(distPath, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error(`[serveStatic] index.html not found at: ${indexPath}`);
    console.error(`[serveStatic] Contents of ${distPath}:`);
    try {
      const contents = fs.readdirSync(distPath);
      contents.forEach(f => console.error(`  - ${f}`));
    } catch (e) {
      console.error(`[serveStatic] Could not read directory: ${e}`);
    }
  }

  // Serve static files
  console.log(`[serveStatic] Serving static files from: ${distPath}`);
  app.use(express.static(distPath, { 
    maxAge: "1h",
    etag: false 
  }));

  // Fallback to index.html for all other routes (SPA routing)
  app.use("*", (_req, res) => {
    console.log(`[serveStatic] Serving index.html for route: ${_req.path}`);
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`[serveStatic] Error sending index.html: ${err.message}`);
        res.status(500).send("Error loading application");
      }
    });
  });
}
