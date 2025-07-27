import { Request, Response } from "express";
import { cacheMetrics } from "../services/cache/CacheMetrics.js";
import { createLogger } from "../logger/index.js";
import path from "node:path";

const logger = createLogger("MetricsController");

export class MetricsController {
  async getMetrics(req: Request, res: Response): Promise<Response | void> {
    try {
      const metrics = await cacheMetrics.getMetrics();
      res.set("Content-Type", "text/plain");
      return res.status(200).send(metrics);
    } catch (error) {
      logger.error("Error getting metrics:", error);
      return res.status(500).json({ error: "Failed to get metrics" });
    }
  }

  async getMetricsJson(req: Request, res: Response): Promise<Response> {
    try {
      const metricsData = await cacheMetrics.getMetricsData();
      return res.status(200).json({
        timestamp: new Date().toISOString(),
        cache: {
          hits: metricsData.hits,
          misses: metricsData.misses,
          hitRate: metricsData.hitRate,
          totalOperations: metricsData.totalOperations,
        },
        performance: {
          averageGetTime: metricsData.avgGetTime.toFixed(2),
          averageSetTime: metricsData.avgSetTime.toFixed(2),
        },
        errors: {
          count: metricsData.errors,
          rate: metricsData.errorRate,
        },
      });
    } catch (error) {
      logger.error("Error getting JSON metrics:", error);
      return res.status(500).json({ error: "Failed to get metrics" });
    }
  }

  async getDashboard(req: Request, res: Response): Promise<Response | void> {
    try {
      return res.sendFile(path.resolve("public/metric-dashboard.html"));
    } catch (error) {
      logger.error("Error getting metrics dashboard:", error);
      return res.status(500).json({ error: "Failed to get metrics dashboard" });
    }
  }
}
