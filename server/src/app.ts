import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { config } from "./config/index.js";
import { logger } from "./lib/logger.js";
import router from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export function createApp(): Express {
  const app: Express = express();

  // Logging
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req: any) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res: any) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    })
  );

  // Security & Parsing
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman) or localhost
        if (!origin || origin.startsWith("http://localhost:") || origin === config.CORS_ORIGIN) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive in prototype rebuild while maintaining credentials
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(cookieParser(config.SESSION_SECRET));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // API Routes
  app.use("/api", router);

  // 404 for unhandled API routes
  app.use("/api/*", (_req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp();
