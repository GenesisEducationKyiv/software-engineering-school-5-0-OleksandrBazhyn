import { config } from "./config.js";
import { createLogger } from "./logger/index.js";
import express from "express";
import cors from "cors";
import http from "http";
import router from "./router/index.js";
import { startEmailEventConsumer } from "./infra/EmailEventConsumer.js";

const PORT = Number(config.PORT) || 3000;
const logger = createLogger("EmailService");

async function startEmailService() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/v1/emails", router);

  const server = http.createServer(app);

  server.listen(PORT, () => {
    logger.info(`Email service is running on port ${PORT}`);
  });

  startEmailEventConsumer().catch((err) => {
    logger.error("Failed to start EmailEventConsumer", err);
  });

  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down gracefully");
    server.close(() => {
      logger.info("Email service closed");
      process.exit(0);
    });
  });
}

startEmailService().catch((error) => {
  logger.error("Failed to start email service", error);
  process.exit(1);
});
