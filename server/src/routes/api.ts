import express from "express";
import {
  WeatherProviderManagerInterface,
  SubscriptionServiceInterface,
} from "../types.js";
import { WeatherController } from "../controllers/WeatherController.js";
import { SubscriptionController } from "../controllers/SubscriptionController.js";
import { MetricsController } from "../controllers/MetricsController.js";

export function createApiRoutes(
  weatherManager: WeatherProviderManagerInterface,
  subscriptionService: SubscriptionServiceInterface,
): express.Router {
  const router = express.Router();

  const weatherController = new WeatherController(weatherManager);
  const subscriptionController = new SubscriptionController(
    subscriptionService,
    weatherManager,
  );
  const metricsController = new MetricsController();

  router.get("/weather", (req, res) => weatherController.getWeather(req, res));
  router.post("/subscribe", (req, res) =>
    subscriptionController.subscribe(req, res),
  );
  router.get("/confirm/:token", (req, res) =>
    subscriptionController.confirm(req, res),
  );
  router.get("/unsubscribe/:token", (req, res) =>
    subscriptionController.unsubscribe(req, res),
  );
  router.get("/metrics", (req, res) => metricsController.getMetrics(req, res));
  router.get("/metrics/json", (req, res) =>
    metricsController.getMetricsJson(req, res),
  );
  router.get("/metrics/dashboard", (req, res) =>
    metricsController.getDashboard(req, res),
  );

  return router;
}

export default createApiRoutes;
