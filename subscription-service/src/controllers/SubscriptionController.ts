import type express from "express";
import type { SubscriptionInput, SubscriptionServiceInterface } from "../types.js";
import {
  AlreadySubscribedError,
  NotConfirmedError,
  InvalidTokenError,
  CityNotFound,
  WeatherServiceError,
  EmailServiceError,
} from "../errors/SubscriptionError.js";
import type { Logger } from "winston";

class SubscriptionController {
  private subscriptionService: SubscriptionServiceInterface;
  private logger: Logger;

  constructor(subscriptionService: SubscriptionServiceInterface, logger: Logger) {
    this.subscriptionService = subscriptionService;
    this.logger = logger;
  }

  async subscribe(req: express.Request, res: express.Response): Promise<void> {
    this.logger.info("Subscription request received:", req.body);
    const { email, city, frequency } = req.body as SubscriptionInput;

    if (!email || !city || !frequency || !["daily", "hourly"].includes(frequency)) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    try {
      await this.subscriptionService.subscribe({ email, city, frequency });
      res.status(200).json({
        message: "Subscription successful. Confirmation email sent.",
      });
    } catch (err: unknown) {
      if (err instanceof AlreadySubscribedError) {
        res.status(409).json({ error: err.message });
      } else if (err instanceof InvalidTokenError) {
        res.status(400).json({ error: err.message });
      } else if (err instanceof CityNotFound) {
        res.status(404).json({ error: "City not found" });
      } else if (err instanceof WeatherServiceError) {
        res.status(500).json({ error: "Weather service error" });
      } else if (err instanceof EmailServiceError) {
        res.status(500).json({ error: "Email service error" });
      } else {
        this.logger.error("Subscription error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }

  async confirm(req: express.Request, res: express.Response): Promise<void> {
    const { token } = req.params;

    if (!token) {
      res.status(400).send("Token is required");
      return;
    }

    try {
      const confirmed = await this.subscriptionService.confirm(token);
      if (confirmed) {
        res.status(200).send("Subscription confirmed successfully");
      } else {
        res.status(400).send("Invalid token");
      }
    } catch (err) {
      if (err instanceof NotConfirmedError) {
        res.status(400).send(err.message);
      } else if (err instanceof InvalidTokenError) {
        res.status(400).send("Invalid token");
      } else {
        this.logger.error("Confirmation error:", err);
        res.status(500).send("Internal server error");
      }
    }
  }

  async unsubscribe(req: express.Request, res: express.Response): Promise<void> {
    const { token } = req.params;

    if (!token) {
      res.status(400).send("Token is required");
      return;
    }

    try {
      const unsubscribed = await this.subscriptionService.unsubscribe(token);
      if (unsubscribed) {
        res.status(200).send("Unsubscribed successfully");
      } else {
        res.status(400).send("Invalid token");
      }
    } catch (err) {
      if (err instanceof InvalidTokenError) {
        res.status(400).send("Invalid token");
      } else {
        this.logger.error("Unsubscribe error:", err);
        res.status(500).send("Internal server error");
      }
    }
  }

  async health(req: express.Request, res: express.Response): Promise<void> {
    res.status(200).json({
      status: "ok",
      service: "subscription-service",
      timestamp: new Date().toISOString(),
    });
  }
}

export default SubscriptionController;
