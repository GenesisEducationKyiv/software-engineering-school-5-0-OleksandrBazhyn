import express from "express";
import {
  WeatherData,
  SubscriptionInput,
  WeatherResponse,
  WeatherProviderManagerInterface,
  SubscriptionServiceInterface,
} from "../types.js";
import {
  AlreadySubscribedError,
  NotConfirmedError,
  InvalidTokenError,
  CityNotFound,
} from "../errors/SubscriptionError.js";
import { cacheMetrics } from "../entities/CacheMetrics.js";
import { createLogger } from "../logger/index.js";

const logger = createLogger("API");

export function createApiRoutes(
  weatherManager: WeatherProviderManagerInterface,
  subscriptionService: SubscriptionServiceInterface,
): express.Router {
  const router = express.Router();

  router.get("/weather", async (req: express.Request, res: express.Response) => {
    const city = req.query.city as string | undefined;
    if (!city) {
      return res.status(400).json({ error: "Invalid request" });
    }
    try {
      const weatherData: WeatherData | null = await weatherManager.getWeatherData(city);

      if (!weatherData || !weatherData.current) {
        return res.status(404).json({ error: "City not found" });
      }

      const data: WeatherResponse = {
        temperature: weatherData.current.temp_c,
        humidity: weatherData.current.humidity,
        description: weatherData.current.condition.text,
      };

      return res.status(200).json(data);
    } catch (err: unknown) {
      if (err instanceof CityNotFound) {
        return res.status(404).json({ error: err.message });
      }
      logger.error("Weather service error:", err);
      return res.status(500).json({ error: "Weather service error" });
    }
  });

  router.post("/subscribe", async (req: express.Request, res: express.Response) => {
    logger.info("Subscription request received:", req.body);
    const { email, city, frequency } = req.body as SubscriptionInput;

    if (!email || !city || !frequency || !["daily", "hourly"].includes(frequency)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    try {
      const weatherData: WeatherData | null = await weatherManager.getWeatherData(city);
      if (!weatherData) {
        return res.status(404).json({ error: "City not found" });
      }
    } catch (err: unknown) {
      if (err instanceof CityNotFound) {
        return res.status(404).json({ error: err.message });
      }
      return res.status(500).json({ error: "Weather API error" });
    }

    try {
      await subscriptionService.subscribe({ email, city, frequency });
      return res.status(200).json({ message: "Subscription successful. Confirmation email sent." });
    } catch (err: unknown) {
      if (err instanceof AlreadySubscribedError) {
        return res.status(409).json({ error: err.message });
      } else if (err instanceof InvalidTokenError) {
        return res.status(400).json({ error: err.message });
      }
      logger.error("Subscription error:", err);
      return res.status(400).json({ error: "Invalid input" });
    }
  });

  router.get("/confirm/:token", async (req, res) => {
    const { token } = req.params;
    try {
      const confirmed = await subscriptionService.confirm(token);
      if (confirmed) {
        return res.status(200).send("Subscription confirmed successfully");
      }
      return res.status(400).send("Invalid token");
    } catch (err) {
      if (err instanceof NotConfirmedError) {
        return res.status(400).send(err.message);
      }
      logger.error("Confirmation error:", err);
      return res.status(404).send("Token not found");
    }
  });

  router.get("/unsubscribe/:token", async (req, res) => {
    const { token } = req.params;
    try {
      const unsubscribed = await subscriptionService.unsubscribe(token);
      if (unsubscribed) {
        return res.status(200).send("Unsubscribed and deleted successfully");
      }
      return res.status(400).send("Invalid token");
    } catch (err) {
      if (err instanceof InvalidTokenError) {
        return res.status(500).send(err.message);
      }
      logger.error("Unsubscribe error:", err);
      return res.status(500).send("Server error");
    }
  });

  router.get("/metrics", async (req: express.Request, res: express.Response) => {
    try {
      const metrics = await cacheMetrics.getMetrics();
      res.set("Content-Type", "text/plain");
      res.status(200).send(metrics);
    } catch (error) {
      logger.error("Error getting metrics:", error);
      res.status(500).json({ error: "Failed to get metrics" });
    }
  });

  router.get("/metrics/dashboard", async (req: express.Request, res: express.Response) => {
    try {
      const metricsData = await cacheMetrics.getMetricsData(); // Нова функція для отримання структурованих даних
      
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cache Metrics Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; }
          .metric-card { background: white; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .metric-title { font-size: 1.2em; font-weight: bold; color: #333; margin-bottom: 10px; }
          .metric-value { font-size: 2em; font-weight: bold; color: #2196F3; }
          .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
          .success { color: #4CAF50; }
          .warning { color: #FF9800; }
          .error { color: #F44336; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Cache Metrics Dashboard</h1>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-title">Cache Hits</div>
              <div class="metric-value success">${metricsData.hits}</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Cache Misses</div>
              <div class="metric-value warning">${metricsData.misses}</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Hit Rate</div>
              <div class="metric-value">${metricsData.hitRate}%</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Average Response Time</div>
              <div class="metric-value">${metricsData.avgResponseTime}ms</div>
            </div>
          </div>
        </div>
      </body>
      </html>`;
      
      res.send(html);
    } catch (error) {
      logger.error("Error getting metrics dashboard:", error);
      res.status(500).json({ error: "Failed to get metrics dashboard" });
    }
  });

  router.get("/metrics/json", async (req: express.Request, res: express.Response) => {
    try {
      const metricsData = await cacheMetrics.getMetricsData();
      res.status(200).json({
        timestamp: new Date().toISOString(),
        cache: {
          hits: metricsData.hits,
          misses: metricsData.misses,
          hitRate: metricsData.hitRate,
          totalOperations: metricsData.hits + metricsData.misses
        },
        performance: {
          averageGetTime: metricsData.avgResponseTime,
          averageSetTime: metricsData.avgResponseTime,
          totalOperationTime: metricsData.totalOperations
        },
        errors: {
          count: metricsData.errors,
          rate: metricsData.errorRate
        }
      });
    } catch (error) {
      logger.error("Error getting JSON metrics:", error);
      res.status(500).json({ error: "Failed to get metrics" });
    }
  });

  return router;
}

export default createApiRoutes;
