import express from "express";
import { createLogger } from "./logger/index.js";
import { config } from "./config.js";
import { createSubscriptionRoutes } from "./routes/api.js";
import SubscriptionController from "./controllers/SubscriptionController.js";
import SubscriptionService from "./services/subscription/SubscriptionService.js";
import SubscriptionDataProvider from "./services/subscription/SubscriptionDataProvider.js";
import SchedulerService from "./services/scheduler/SchedulerService.js";
import WeatherServiceGrpcClient from "./clients/WeatherServiceGrpcClient.js";
import EmailServiceHttpClient from "./clients/EmailServiceHttpClient.js";

const logger = createLogger("SubscriptionService");

async function startServer() {
  try {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const dataProvider = new SubscriptionDataProvider();
    const weatherClient = new WeatherServiceGrpcClient();
    const emailClient = new EmailServiceHttpClient();

    const subscriptionService = new SubscriptionService(
      dataProvider,
      weatherClient,
      emailClient,
      createLogger("SubscriptionService"),
    );

    const schedulerService = new SchedulerService(
      subscriptionService,
      weatherClient,
      emailClient,
      createLogger("SchedulerService"),
    );

    const subscriptionController = new SubscriptionController(
      subscriptionService,
      createLogger("SubscriptionController"),
    );

    app.use("/api/v1", createSubscriptionRoutes(subscriptionController));

    app.use(
      (error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
        logger.error("Unhandled error:", error);
        res.status(500).json({ error: "Internal server error" });
      },
    );

    const server = app.listen(config.PORT, () => {
      logger.info(`Subscription service started on port ${config.PORT}`);
    });

    schedulerService.start();

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      schedulerService.stop();

      server.close(() => {
        logger.info("Subscription service stopped");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start subscription service:", error);
    process.exit(1);
  }
}

startServer();
