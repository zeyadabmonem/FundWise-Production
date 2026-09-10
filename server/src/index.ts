import { createApp } from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./lib/logger.js";
import { initDatabase } from "./db/connection.js";

async function bootstrap() {
  // Initialize Database connection
  await initDatabase();

  const app = createApp();

  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 FundWise API Server running at http://localhost:${config.PORT}`);
    logger.info(`📊 Environment: ${config.NODE_ENV}`);
    logger.info(`🤖 AI Features: ${config.OPENAI_API_KEY ? "Live OpenAI Active" : "Offline Fallback Active"}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received. Gracefully shutting down...`);
    server.close(() => {
      logger.info("HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((error) => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});
