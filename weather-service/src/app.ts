import { config } from "./config.js";
import { createLogger } from "./logger/index.js";
import express from "express";
import { WeatherController } from "./controllers/WeatherController.js";
import WeatherProviderManager from "./services/WeatherProviderManager.js";
import { RedisClient } from "./services/cache/RedisClient.js";
import { ErrorResponse, HealthResponse } from "./types.js";

const PORT = Number(config.PORT) || 3000;
const logger = createLogger("WeatherService");

async function startWeatherService() {
  const app = express();

  app.use(express.json());

  let redisClient: RedisClient | null = null;
  if (config.REDIS_ENABLED) {
    try {
      redisClient = new RedisClient(config.REDIS_URL, logger);
      await redisClient.connect();
      logger.info("Redis client connected successfully");
    } catch (error) {
      logger.error("Failed to connect to Redis:", error);
      // Continue without cache
    }
  }

  const weatherManager = new WeatherProviderManager(logger, redisClient || undefined);
  const weatherController = new WeatherController(weatherManager);

  app.get("/api/v1/weather", async (req, res) => {
    try {
      const response = await weatherController.getWeather(req, res);
      if (!res.headersSent) {
        return response;
      }
    } catch (error) {
      logger.error("Weather endpoint error:", error);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Internal server error" } as ErrorResponse);
      }
    }
  });

  // Health check endpoint
  app.get("/api/v1/health", async (req, res) => {
    const healthResponse: HealthResponse = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        cache: redisClient?.isConnected() ? "connected" : "disconnected",
        providers: ["WeatherAPI", "OpenWeatherMap"],
      },
    };

    res.status(200).json(healthResponse);
  });

  // Cache invalidation endpoint
  app.post("/api/v1/weather/cache/invalidate", async (req, res) => {
    const { city } = req.body;

    if (!city) {
      return res.status(400).json({ error: "City parameter is required" } as ErrorResponse);
    }

    try {
      const cacheService = weatherManager.getCacheService();
      if (cacheService) {
        await cacheService.invalidate(city);
        logger.info(`Cache invalidated for city: ${city}`);
        res.status(200).json({ message: `Cache invalidated for ${city}` });
      } else {
        res.status(503).json({ error: "Cache service not available" } as ErrorResponse);
      }
    } catch (error) {
      logger.error(`Failed to invalidate cache for ${city}:`, error);
      res.status(500).json({ error: "Failed to invalidate cache" } as ErrorResponse);
    }
  });

  // Start server
  const server = app.listen(PORT, () => {
    logger.info(`Weather Service started on port ${PORT}`);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, shutting down gracefully");

    server.close(() => {
      logger.info("HTTP server closed");
    });

    if (redisClient) {
      await redisClient.disconnect();
      logger.info("Redis client disconnected");
    }

    process.exit(0);
  });

  process.on("SIGINT", async () => {
    logger.info("SIGINT received, shutting down gracefully");

    server.close(() => {
      logger.info("HTTP server closed");
    });

    if (redisClient) {
      await redisClient.disconnect();
      logger.info("Redis client disconnected");
    }

    process.exit(0);
  });
}

startWeatherService().catch((error) => {
  logger.error("Failed to start Weather Service:", error);
  process.exit(1);
});
