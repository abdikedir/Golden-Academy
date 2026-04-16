import express from "express";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import routes from "./routes/index.js";
import { env } from "./config/env.js";
import { loggerMiddleware } from "./middlewares/logger.middleware.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");

const corsMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const corsAllowedHeaders = ["Content-Type", "Authorization"];

const isSameHostOrigin = (origin, host) => {
  try {
    return Boolean(origin && host && new URL(origin).host === host);
  } catch {
    return false;
  }
};

const corsOptionsDelegate = (req, callback) => {
  const origin = req.header("Origin");
  const host = req.header("X-Forwarded-Host") || req.header("Host");

  const allowOrigin =
    !origin ||
    env.corsOrigins.includes("*") ||
    env.corsOrigins.includes(origin) ||
    isSameHostOrigin(origin, host);

  callback(null, {
    origin: allowOrigin,
    methods: corsMethods,
    allowedHeaders: corsAllowedHeaders,
    credentials: true,
    optionsSuccessStatus: 204,
  });
};

app.disable("x-powered-by");
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(loggerMiddleware);

// Apply CORS rules to API routes only. Static assets must not be blocked by CORS middleware.
app.use("/api", cors(corsOptionsDelegate));

app.get("/api/health", (_req, res) => {
  return res
    .status(200)
    .json({ success: true, message: "Healthy", data: { env: env.nodeEnv } });
});

app.use("/api", routes);

if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  // Keep API routes under /api while letting SPA routes resolve to index.html.
  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    return res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
