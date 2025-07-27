import express from "express";
import { SubscriptionController } from "../controllers/SubscriptionController.js";
import { HealthController } from "../controllers/HealthController.js";
import { SubscriptionServiceInterface } from "../types.js";
import { WeatherGrpcClient } from "../clients/WeatherGrpcClient.js";
import { EmailServiceClient } from "../clients/EmailServiceClient.js";
import { createLogger } from "../logger/index.js";
import client from "prom-client";

export function createApiRoutes(
  subscriptionService: SubscriptionServiceInterface,
  weatherClient: WeatherGrpcClient,
  emailClient: EmailServiceClient,
): express.Router {
  const router = express.Router();

  const subscriptionController = new SubscriptionController(
    subscriptionService,
    createLogger("SubscriptionController"),
  );
  const healthController = new HealthController(
    weatherClient,
    emailClient,
    createLogger("HealthController"),
  );

  router.post("/subscribe", (req, res) => subscriptionController.subscribe(req, res));
  router.get("/confirm/:token", (req, res) => subscriptionController.confirm(req, res));
  router.get("/unsubscribe/:token", (req, res) => subscriptionController.unsubscribe(req, res));

  router.get("/health", (req, res) => healthController.checkExternalServices(req, res));
  router.get("/health/service", (req, res) => healthController.checkInternalService(req, res));

  client.collectDefaultMetrics();

  router.get("/metrics", async (req, res) => {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  });

  return router;
}

export default createApiRoutes;
