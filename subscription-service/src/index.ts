import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Server } from "http";
import { WeatherScheduler } from "./services/scheduler/WeatherScheduler.js";
import { SubscriptionService } from "./services/subscription/SubscriptionService.js";
import { SubscriptionDataProvider } from "./services/subscription/SubscriptionDataProvider.js";
import { WeatherGrpcClient } from "./clients/WeatherGrpcClient.js";
import { EmailServiceClient } from "./clients/EmailServiceClient.js";
import { createLogger } from "./logger/index.js";
import createApiRoutes from "./routes/api.js";
import { config } from "./config.js";

const logger = createLogger("SubscriptionService");

async function initializeClients() {
  const weatherClient = new WeatherGrpcClient(config.weather.grpcUrl);

  const emailClient = new EmailServiceClient(config.EMAIL_SERVICE_URL, createLogger("EmailClient"));

  return { weatherClient, emailClient };
}

async function checkExternalServices(
  weatherClient: WeatherGrpcClient,
  emailClient: EmailServiceClient,
) {
  const [weatherHealthy, emailHealthy] = await Promise.allSettled([
    weatherClient.healthCheck(),
    emailClient.healthCheck(),
  ]);

  if (weatherHealthy.status === "rejected" || !weatherHealthy.value) {
    logger.warn("Weather service is not available");
  }

  if (emailHealthy.status === "rejected" || !emailHealthy.value) {
    logger.warn("Email service is not available");
  }

  return {
    weatherHealthy: weatherHealthy.status === "fulfilled" && weatherHealthy.value,
    emailHealthy: emailHealthy.status === "fulfilled" && emailHealthy.value,
  };
}

function initializeServices(weatherClient: WeatherGrpcClient, emailClient: EmailServiceClient) {
  const subscriptionDataProvider = new SubscriptionDataProvider();

  const subscriptionService = new SubscriptionService(
    subscriptionDataProvider,
    weatherClient,
    emailClient,
  );

  const scheduler = new WeatherScheduler(subscriptionService, weatherClient, emailClient);

  return {
    subscriptionDataProvider,
    subscriptionService,
    scheduler,
  };
}

function createExpressApp(
  subscriptionService: SubscriptionService,
  weatherClient: WeatherGrpcClient,
  emailClient: EmailServiceClient,
): express.Application {
  const app = express();

  // Security and CORS middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get("User-Agent")?.substring(0, 100),
    });
    next();
  });

  // API routes
  const apiRoutes = createApiRoutes(subscriptionService, weatherClient, emailClient);
  app.use("/api/subscriptions", apiRoutes);

  // 404 handler
  app.use("*", (req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
  });

  return app;
}

function setupGracefulShutdown(
  server: Server,
  scheduler: WeatherScheduler,
  weatherClient: WeatherGrpcClient,
  subscriptionDataProvider: SubscriptionDataProvider,
) {
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down subscription service...`);

    try {
      // Stop accepting new connections
      server.close(async () => {
        logger.info("HTTP server closed");

        // Stop scheduler first
        scheduler.stopScheduler();
        logger.info("Scheduler stopped");

        // Close external connections
        weatherClient.disconnect();
        logger.info("Weather client disconnected");

        // Close database connections
        if (subscriptionDataProvider.disconnect) {
          await subscriptionDataProvider.disconnect();
          logger.info("Database connections closed");
        }

        logger.info("Graceful shutdown completed");
        process.exit(0);
      });

      // Force exit after timeout
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    } catch (error) {
      logger.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

// Main server startup function
async function startServer() {
  try {
    logger.info("Starting subscription service...");

    // Initialize clients
    const { weatherClient, emailClient } = await initializeClients();

    // Health checks
    const healthStatus = await checkExternalServices(weatherClient, emailClient);
    logger.info("External services health check completed", healthStatus);

    // Initialize core services
    const { subscriptionDataProvider, subscriptionService, scheduler } = initializeServices(
      weatherClient,
      emailClient,
    );

    // Start scheduler
    scheduler.startScheduler();
    logger.info("Weather scheduler started");

    // Create Express app
    const app = createExpressApp(subscriptionService, weatherClient, emailClient);

    // Start server
    const port = config.PORT;
    const server = app.listen(port, () => {
      logger.info(`Subscription service running on port ${port}`);
      logger.info("Service initialization completed successfully");
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server, scheduler, weatherClient, subscriptionDataProvider);
  } catch (error) {
    logger.error("Failed to start subscription service:", error);
    process.exit(1);
  }
}

// Error handling for unhandled promises/exceptions
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Start the application
startServer().catch((error) => {
  logger.error("Unhandled error during startup:", error);
  process.exit(1);
});
