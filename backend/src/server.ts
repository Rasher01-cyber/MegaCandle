import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
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

  return app;
}

