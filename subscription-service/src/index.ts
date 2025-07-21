import express from "express";
import cors from "cors";
import helmet from "helmet";
import { WeatherScheduler } from "./services/WeatherScheduler";
import { SubscriptionService } from "./services/SubscriptionService";
import { SubscriptionDataProvider } from "./dataProviders/SubscriptionDataProvider";
import { WeatherGrpcClient } from "./clients/WeatherGrpcClient";
import { EmailServiceClient } from "./clients/EmailServiceClient";
import { logger } from "./logger.js";
import createApiRoutes from "./routes/api.js"; // Import the routes

async function startServer() {
  try {
    // Initialize external service clients
    const weatherClient = new WeatherGrpcClient(process.env.WEATHER_SERVICE_URL);
    const emailClient = new EmailServiceClient(process.env.EMAIL_SERVICE_URL);

    // Health checks for external services
    const weatherHealthy = await weatherClient.healthCheck();
    const emailHealthy = await emailClient.healthCheck();

    if (!weatherHealthy) {
      logger.warn("Weather service is not available");
    }
    if (!emailHealthy) {
      logger.warn("Email service is not available");
    }

    // Initialize data providers
    const subscriptionDataProvider = new SubscriptionDataProvider();

    // Initialize services with external dependencies
    const subscriptionService = new SubscriptionService(
      subscriptionDataProvider,
      weatherClient,
      emailClient,
    );

    // Initialize scheduler
    const scheduler = new WeatherScheduler(subscriptionService, weatherClient, emailClient);

    // Start scheduler
    scheduler.startScheduler();

    // Setup routes with proper middleware
    const app = express();
    
    // Security and CORS
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    
    // Use the routes from api.ts instead of duplicating
    const apiRoutes = createApiRoutes(subscriptionService, weatherClient, emailClient);
    app.use("/api/subscriptions", apiRoutes);

    const port = process.env.PORT || 3002;
    app.listen(port, () => {
      logger.info(`Subscription service running on port ${port}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("Shutting down subscription service...");
      weatherClient.disconnect();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start subscription service:", error);
    process.exit(1);
  }
}

startServer();
