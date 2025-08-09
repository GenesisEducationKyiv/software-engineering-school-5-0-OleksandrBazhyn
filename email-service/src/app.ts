import { config } from "./config.js";
import { createLogger } from "./logger/index.js";
import express from "express";
import cors from "cors";
import http from "http";
import router from "./router/index.js";
import { startEmailEventConsumer } from "./infra/EmailEventConsumer.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { HealthController } from "./controllers/healthController.js";

const PORT = Number(config.PORT) || 3000;
const logger = createLogger("EmailService");

async function startEmailService() {
  const app = express();
  const healthController = new HealthController(logger);

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(loggingMiddleware(logger));

  // Health check endpoint
  app.get("/health", (req, res) => healthController.getHealth(req, res));

  // Metrics endpoint for Prometheus
  app.get("/metrics", (req, res) => healthController.getMetrics(req, res));

  // API routes
  app.use("/api/v1/emails", router);

  const server = http.createServer(app);

  server.listen(PORT, () => {
    logger.info("Email service started", {
      port: PORT,
      environment: config.NODE_ENV,
      endpoints: ["/health", "/metrics", "/api/v1/emails"],
    });
  });

  startEmailEventConsumer().catch((err) => {
    logger.error("Failed to start EmailEventConsumer", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  });

  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    logger.info("Graceful shutdown initiated", { signal });
    server.close(() => {
      logger.info("Email service closed successfully");
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 30000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

startEmailService().catch((error) => {
  logger.error("Failed to start email service", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
