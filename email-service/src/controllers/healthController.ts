import { Request, Response } from "express";
import { Logger } from "winston";
import { metrics } from "../metrics/index.js";

export class HealthController {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child({ controller: "HealthController" });
  }

  async getHealth(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Basic health check
      const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "unknown",
        environment: process.env.NODE_ENV || "unknown",
        memory: {
          used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
          total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        },
        checks: {
          database: await this.checkDatabase(),
          redis: await this.checkRedis(),
          smtp: await this.checkSMTP(),
        },
      };

      // Determine overall health status
      const allChecksHealthy = Object.values(health.checks).every(
        (check) => check.status === "healthy",
      );
      health.status = allChecksHealthy ? "healthy" : "unhealthy";

      const statusCode = allChecksHealthy ? 200 : 503;
      const duration = Date.now() - startTime;

      this.logger.info("Health check completed", {
        status: health.status,
        duration,
        checks: health.checks,
      });

      res.status(statusCode).json(health);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error("Health check failed", {
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(503).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async checkDatabase(): Promise<{
    status: string;
    responseTime?: number;
    error?: string;
  }> {
    // Placeholder for database health check
    // In real implementation, you would check database connectivity
    return {
      status: "healthy",
      responseTime: 5,
    };
  }

  private async checkRedis(): Promise<{ status: string; responseTime?: number; error?: string }> {
    const startTime = Date.now();
    try {
      // This would be a real Redis ping in production
      const responseTime = Date.now() - startTime;
      return {
        status: "healthy",
        responseTime,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Redis connection failed",
      };
    }
  }

  private async checkSMTP(): Promise<{ status: string; responseTime?: number; error?: string }> {
    const startTime = Date.now();
    try {
      // This would be a real SMTP verification in production
      const responseTime = Date.now() - startTime;
      return {
        status: "healthy",
        responseTime,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "SMTP connection failed",
      };
    }
  }

  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const prometheusMetrics = await metrics.getMetrics();
      res.set("Content-Type", "text/plain");
      res.end(prometheusMetrics);

      this.logger.debug("Metrics endpoint accessed", {
        userAgent: req.get("user-agent"),
        ip: req.ip,
      });
    } catch (error) {
      this.logger.error("Failed to generate metrics", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to generate metrics" });
    }
  }
}
