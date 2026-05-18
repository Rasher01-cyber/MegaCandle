import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { config } from "./util/config";
import { createApiRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";

export function createServer() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.FRONTEND_ORIGIN,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use("/uploads", express.static(path.resolve(process.cwd(), config.UPLOAD_DIR)));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
    }),
  );

  app.use("/api", createApiRouter());
  app.use(errorHandler);

  // If a built frontend exists, serve it (single-host deployment).
  // This avoids cross-domain cookie issues and makes `/app/*` work immediately.
  const candidateFrontendDist = [
    process.env.FRONTEND_DIST_DIR,
    // If started from repo root: <repo>/frontend/dist
    path.resolve(process.cwd(), "frontend", "dist"),
    // If started from backend folder: <repo>/../frontend/dist
    path.resolve(process.cwd(), "..", "frontend", "dist"),
    // Fallback relative to this file after build: <repo>/frontend/dist
    path.resolve(__dirname, "..", "..", "frontend", "dist"),
  ].filter((p): p is string => Boolean(p));

  const frontendDist = candidateFrontendDist.find((p) => fs.existsSync(p));

  try {
    if (frontendDist) {
      const indexHtml = path.join(frontendDist, "index.html");

      // SPA fallback middleware:
      // - For API routes -> keep going
      // - For static assets (has extension) -> keep going
      // - Otherwise -> serve SPA entrypoint
      app.use((req, res, next) => {
        if (req.path.startsWith("/api")) return next();
        if (path.extname(req.path)) return next();
        return res.sendFile(indexHtml);
      });

      // Serve built frontend assets (js/css/images) from dist.
      app.use(express.static(frontendDist));
    }
  } catch {
    // Non-fatal: backend-only mode works.
  }

  return app;
}

