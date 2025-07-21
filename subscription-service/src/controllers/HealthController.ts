import { Request, Response } from "express";
import {
  WeatherGrpcClientInterface,
  EmailServiceInterface,
  ServiceHealthStatus,
  HealthResponse,
} from "../types.js";
import { Logger } from "winston";
import { config } from "../config.js";

export class HealthController {
  constructor(
    private weatherClient: WeatherGrpcClientInterface,
    private emailClient: EmailServiceInterface,
    private logger: Logger,
  ) {}

  async checkExternalServices(req: Request, res: Response): Promise<void> {
    try {
      const [weatherResult, emailResult] = await Promise.allSettled([
        this.checkServiceWithTiming("weather", () => this.weatherClient.healthCheck()),
        this.checkServiceWithTiming("email", () => this.emailClient.healthCheck()),
      ]);

      const weatherHealth = this.extractHealthResult(weatherResult);
      const emailHealth = this.extractHealthResult(emailResult);

      const overallStatus = this.determineOverallStatus(weatherHealth, emailHealth);

      const health: HealthResponse = {
        service: "subscription-service",
        status: overallStatus,
        services: {
          weather: weatherHealth,
          email: emailHealth,
        },
        timestamp: new Date().toISOString(),
      };

      const statusCode = overallStatus === "healthy" ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      this.logger.error("Health check error:", error);
      res.status(503).json({
        service: "subscription-service",
        status: "error",
        error: "Health check failed",
        timestamp: new Date().toISOString(),
      });
    }
  }

  async checkInternalService(req: Request, res: Response): Promise<void> {
    try {
      // Check internal components
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const health = {
        service: "subscription-service",
        status: "healthy",
        version: config.NPM_PACKAGE_VERSION || "unknown",
        uptime: Math.floor(process.uptime()),
        environment: config.NODE_ENV || "unknown",
        resources: {
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + "MB",
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + "MB",
            external: Math.round(memoryUsage.external / 1024 / 1024) + "MB",
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system,
          },
        },
        timestamp: new Date().toISOString(),
      };

      const statusCode = health.status === "healthy" ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      this.logger.error("Internal health check error:", error);
      res.status(503).json({
        service: "subscription-service",
        status: "error",
        error: "Internal health check failed",
        timestamp: new Date().toISOString(),
      });
    }
  }

  async checkSpecificService(req: Request, res: Response): Promise<void> {
    const { service } = req.params;

    try {
      let healthCheck: () => Promise<boolean>;

      switch (service) {
        case "weather":
          healthCheck = () => this.weatherClient.healthCheck();
          break;
        case "email":
          healthCheck = () => this.emailClient.healthCheck();
          break;
        default:
          res.status(400).json({ error: "Unknown service" });
          return;
      }

      const result = await this.checkServiceWithTiming(service, healthCheck);
      const statusCode = result.status === "up" ? 200 : 503;

      res.status(statusCode).json({
        service,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Health check error for ${service}:`, error);
      res.status(503).json({
        service,
        status: "error",
        error: "Health check failed",
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async checkServiceWithTiming(
    serviceName: string,
    healthCheck: () => Promise<boolean>,
  ): Promise<ServiceHealthStatus> {
    const startTime = Date.now();

    try {
      const isHealthy = await healthCheck();
      const responseTime = Date.now() - startTime;

      return {
        status: isHealthy ? "up" : "down",
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: "down",
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error",
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private extractHealthResult(
    result: PromiseSettledResult<ServiceHealthStatus>,
  ): ServiceHealthStatus {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      status: "down",
      error: result.reason?.message || "Service check failed",
      lastCheck: new Date().toISOString(),
    };
  }

  private determineOverallStatus(
    weatherHealth: ServiceHealthStatus,
    emailHealth: ServiceHealthStatus,
  ): "healthy" | "degraded" | "error" {
    if (weatherHealth.status === "up" && emailHealth.status === "up") {
      return "healthy";
    } else if (weatherHealth.status === "down" && emailHealth.status === "down") {
      return "error";
    }
    return "degraded";
  }
}
