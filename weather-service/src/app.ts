import { config } from "./config.js";
import { createLogger } from "./logger/index.js";
import express, { Request } from "express";
import { WeatherController } from "./controllers/WeatherController.js";
import WeatherProviderManager from "./services/WeatherProviderManager.js";
import { RedisClient } from "./services/cache/RedisClient.js";
import { WeatherGrpcServer } from "./grpc/WeatherGrpcServer.js";
import { ErrorResponse, HealthResponse } from "./types.js";
import { client, healthStatus, errorRate } from "./metrics/index.js";
import { createLoggingMiddleware, createErrorLoggingMiddleware } from "./middleware/logging.js";

interface RequestWithId extends Request {
  requestId?: string;
}

const PORT = Number(config.PORT) || 3000;
const GRPC_PORT = Number(config.GRPC_PORT) || 50051;
const logger = createLogger("WeatherService");

async function startWeatherService() {
  const app = express();

  app.use(express.json());

  // Add logging middleware
  app.use(
    createLoggingMiddleware({
      logger,
      includeBody: config.NODE_ENV === "development",
      includeHeaders: config.NODE_ENV === "development",
    }),
  );

  let redisClient: RedisClient | null = null;
  if (config.REDIS_ENABLED) {
    try {
      redisClient = new RedisClient(config.REDIS_URL, logger);
      await redisClient.connect();
      logger.info("Redis client connected successfully", {
        service: "redis",
        status: "connected",
        url: config.REDIS_URL,
      });
      healthStatus.set({ component: "redis" }, 1);
    } catch (error) {
      logger.error("Failed to connect to Redis", {
        service: "redis",
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        url: config.REDIS_URL,
      });
      healthStatus.set({ component: "redis" }, 0);
      errorRate.inc({ type: "connection", service: "redis" });
      // Continue without cache
    }
  } else {
    logger.info("Redis cache disabled by configuration", {
      service: "redis",
      status: "disabled",
    });
    healthStatus.set({ component: "redis" }, 0);
  }

  const weatherManager = new WeatherProviderManager(logger, redisClient || undefined);
  const weatherController = new WeatherController(weatherManager);

  // Start gRPC server
  let grpcServer: WeatherGrpcServer;
  try {
    grpcServer = new WeatherGrpcServer(weatherManager, logger);
    await grpcServer.start(GRPC_PORT);
    logger.info("gRPC server started successfully", {
      service: "grpc",
      port: GRPC_PORT,
      status: "running",
    });
    healthStatus.set({ component: "grpc" }, 1);
  } catch (error) {
    logger.error("Failed to start gRPC server", {
      service: "grpc",
      port: GRPC_PORT,
      error: error instanceof Error ? error.message : String(error),
    });
    healthStatus.set({ component: "grpc" }, 0);
    errorRate.inc({ type: "startup", service: "grpc" });
    throw error;
  }

  app.get("/api/v1/weather", async (req: RequestWithId, res) => {
    const startTime = Date.now();
    try {
      logger.debug("Processing weather request", {
        city: req.query.city,
        requestId: req.requestId,
      });
      
      const response = await weatherController.getWeather(req, res);
      if (!res.headersSent) {
        const duration = Date.now() - startTime;
        logger.info("Weather request completed successfully", {
          city: req.query.city,
          duration,
          requestId: req.requestId,
        });
        return response;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Weather endpoint error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        city: req.query.city,
        duration,
        requestId: req.requestId,
      });
      errorRate.inc({ type: "api", service: "weather" });
      
      if (!res.headersSent) {
        return res.status(500).json({
          error: "Internal server error",
          requestId: req.requestId,
        } as ErrorResponse);
      }
    }
  });

  // Health check endpoint
  app.get("/api/v1/health", async (req: RequestWithId, res) => {
    logger.debug("Health check requested", {
      requestId: req.requestId,
    });

    const isRedisConnected = redisClient?.isConnected() || false;
    const overallHealthy = isRedisConnected || !config.REDIS_ENABLED;

    const healthResponse: HealthResponse = {
      status: overallHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      services: {
        cache: isRedisConnected ? "connected" : "disconnected",
        providers: ["WeatherAPI", "OpenWeatherMap"],
      },
    };

    // Update health metrics
    healthStatus.set({ component: "service" }, overallHealthy ? 1 : 0);

    const statusCode = overallHealthy ? 200 : 503;
    logger.info("Health check completed", {
      status: healthResponse.status,
      services: healthResponse.services,
      statusCode,
      requestId: req.requestId,
    });

    res.status(statusCode).json(healthResponse);
  });

  client.collectDefaultMetrics();

  app.get("/metrics", async (req, res) => {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  });

  // Cache invalidation endpoint
  app.post("/api/v1/weather/cache/invalidate", async (req: RequestWithId, res) => {
    const { city } = req.body;
    const requestId = req.requestId;

    logger.debug("Cache invalidation requested", {
      city,
      requestId,
    });

    if (!city) {
      logger.warn("Cache invalidation failed: missing city parameter", {
        requestId,
      });
      return res.status(400).json({
        error: "City parameter is required",
        requestId,
      } as ErrorResponse);
    }

    try {
      const cacheService = weatherManager.getCacheService();
      if (cacheService) {
        await cacheService.invalidate(city);
        logger.info("Cache invalidated successfully", {
          city,
          requestId,
        });
        res.status(200).json({
          message: `Cache invalidated for ${city}`,
          requestId,
        });
      } else {
        logger.warn("Cache invalidation failed: cache service not available", {
          city,
          requestId,
        });
        res.status(503).json({
          error: "Cache service not available",
          requestId,
        } as ErrorResponse);
      }
    } catch (error) {
      logger.error("Failed to invalidate cache", {
        city,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        requestId,
      });
      errorRate.inc({ type: "cache", service: "invalidation" });
      res.status(500).json({
        error: "Failed to invalidate cache",
        requestId,
      } as ErrorResponse);
    }
  });

  // Add error handling middleware
  app.use(createErrorLoggingMiddleware(logger));

  // Start server
  const server = app.listen(PORT, () => {
    logger.info("Weather Service started successfully", {
      service: "http",
      port: PORT,
      environment: config.NODE_ENV,
      status: "running",
    });
    healthStatus.set({ component: "http" }, 1);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, shutting down gracefully", {
      signal: "SIGTERM",
    });

    server.close(() => {
      logger.info("HTTP server closed", {
        service: "http",
        status: "stopped",
      });
    });

    if (grpcServer) {
      await grpcServer.stop();
      logger.info("gRPC server stopped", {
        service: "grpc",
        status: "stopped",
      });
    }

    if (redisClient) {
      await redisClient.disconnect();
      logger.info("Redis client disconnected", {
        service: "redis",
        status: "disconnected",
      });
    }

    process.exit(0);
  });

  process.on("SIGINT", async () => {
    logger.info("SIGINT received, shutting down gracefully", {
      signal: "SIGINT",
    });

    server.close(() => {
      logger.info("HTTP server closed", {
        service: "http",
        status: "stopped",
      });
    });

    if (grpcServer) {
      await grpcServer.stop();
      logger.info("gRPC server stopped", {
        service: "grpc",
        status: "stopped",
      });
    }

    if (redisClient) {
      await redisClient.disconnect();
      logger.info("Redis client disconnected", {
        service: "redis",
        status: "disconnected",
      });
    }

    process.exit(0);
  });
}

startWeatherService().catch((error) => {
  logger.error("Failed to start Weather Service", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    service: "startup",
  });
  errorRate.inc({ type: "startup", service: "main" });
  process.exit(1);
});
