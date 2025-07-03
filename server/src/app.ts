import express from "express";
import cors from "cors";
import createApiRoutes from "./routes/api.js";
import http from "http";
import { setupWebSocket } from "./ws-server.js";
import Scheduler from "./entities/Scheduler.js";
import MailManager from "./entities/MailManager.js";
import SubscriptionDataProvider from "./entities/SubscriptionDataProvider.js";
import { createServices } from "./container/ServiceContainer.js";
import { config } from "./config.js";
import { createLogger } from "./logger/index.js";
import { createLogger } from "./logger/index.js";
import nodemailer from "nodemailer";

const PORT = Number(config.PORT) || 3000;
const logger = createLogger("Server");
const PORT = Number(config.PORT) || 3000;
const logger = createLogger("Server");

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const services = await createServices();

  const apiRoutes = createApiRoutes(services.weatherManager, services.subscriptionService);
  app.use("/api/v1", apiRoutes);

  const server = http.createServer(app);

  setupWebSocket(server, services.weatherManager);

  server.listen(PORT, () => {
    logger.info(`Server is running (HTTP + WS) on port ${PORT}`);
  });

  const scheduler = new Scheduler(createLogger("Scheduler"));
  scheduler.start(
    new MailManager(
      nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
      }),
      createLogger("MailManager"),
    ),
    SubscriptionDataProvider,
  );

  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, shutting down gracefully");

    if (services.redisClient) {
      await services.redisClient.disconnect();
    }

    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });
}

startServer().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
