import express, { Router, Request, Response } from "express";
import {
  SubscriptionInput,
  SubscriptionServiceInterface,
} from "../types.js";
import {
  AlreadySubscribedError,
  NotConfirmedError,
  InvalidTokenError,
} from "../errors/SubscriptionError.js";
import { createLogger } from "../logger/index.js";
import { WeatherGrpcClient } from "../clients/WeatherGrpcClient";
import { EmailServiceClient } from "../clients/EmailServiceClient";

const logger = createLogger("API");

export function createApiRoutes(
  subscriptionService: SubscriptionServiceInterface,
  weatherClient: WeatherGrpcClient,
  emailClient: EmailServiceClient,
): express.Router {
  const router = express.Router();

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
      await subscriptionService.subscribe({ email, city, frequency });
      return res.status(200).json({
        message: "Subscription successful. Confirmation email sent.",
      });
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

  router.get("/health", async (req: Request, res: Response) => {
    const weatherHealthy = await weatherClient.healthCheck();
    const emailHealthy = await emailClient.healthCheck();

    const health = {
      status: weatherHealthy && emailHealthy ? "healthy" : "degraded",
      services: {
        weather: weatherHealthy ? "up" : "down",
        email: emailHealthy ? "up" : "down"
      },
      timestamp: new Date().toISOString(),
    };

    res.status(health.status === "healthy" ? 200 : 503).json(health);
  });

  return router;
}

export default createApiRoutes;
