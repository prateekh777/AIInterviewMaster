import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { wrapCreateResult, wrapGetResult, wrapGetResultByInterviewId } from "./error-handler";

// Apply runtime patches to fix typing issues
const originalCreateResult = storage.createResult.bind(storage);
const originalGetResult = storage.getResult.bind(storage);
const originalGetResultByInterviewId = storage.getResultByInterviewId.bind(storage);

storage.createResult = (result) => wrapCreateResult(originalCreateResult, result);
storage.getResult = (id) => wrapGetResult(originalGetResult, id);
storage.getResultByInterviewId = (interviewId) => wrapGetResultByInterviewId(originalGetResultByInterviewId, interviewId);

console.log("[CHECKPOINT:STORAGE_PATCHED] Applied runtime patches to MongoDB storage");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use port from environment variables with fallback
  const WS_HOST = process.env.HOST || 'localhost';
  const WS_PORT = process.env.PORT ? parseInt(process.env.PORT) : 5001;
  server.listen(WS_PORT, () => {
    log(`serving on port ${WS_PORT}`);
  });
})();
