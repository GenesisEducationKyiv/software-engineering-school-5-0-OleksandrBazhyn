import { Request, Response } from "express";
import { WeatherGrpcClient } from "../clients/WeatherGrpcClient.js";
import { EmailServiceClient } from "../clients/EmailServiceClient.js";
import { createLogger } from "../logger/index.js";

const logger = createLogger("HealthController");

export class HealthController {
  constructor(
    private weatherClient: WeatherGrpcClient,
    private emailClient: EmailServiceClient,
  ) {}

  async checkHealth(req: Request, res: Response): Promise<void> {
    try {
      const [weatherHealthy, emailHealthy] = await Promise.allSettled([
        this.weatherClient.healthCheck(),
        this.emailClient.healthCheck(),
      ]);

      const weatherStatus = weatherHealthy.status === 'fulfilled' && weatherHealthy.value;
      const emailStatus = emailHealthy.status === 'fulfilled' && emailHealthy.value;

      const health = {
        service: "subscription-service",
        status: weatherStatus && emailStatus ? "healthy" : "degraded",
        services: {
          weather: {
            status: weatherStatus ? "up" : "down",
            lastCheck: new Date().toISOString(),
          },
          email: {
            status: emailStatus ? "up" : "down",
            lastCheck: new Date().toISOString(),
          },
        },
        timestamp: new Date().toISOString(),
      };

      const statusCode = health.status === "healthy" ? 200 : 503;
      res.status(statusCode).json(health);
      
    } catch (error) {
      logger.error("Health check error:", error);
      res.status(503).json({
        service: "subscription-service",
        status: "error",
        error: "Health check failed",
        timestamp: new Date().toISOString(),
      });
    }
  }

  async checkServiceHealth(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      service: "subscription-service",
      status: "healthy",
      version: process.env.npm_package_version || "unknown",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }
}