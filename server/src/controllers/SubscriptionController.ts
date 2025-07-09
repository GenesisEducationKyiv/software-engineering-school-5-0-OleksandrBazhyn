import { Request, Response } from "express";
import {
  SubscriptionServiceInterface,
  SubscriptionInput,
  WeatherProviderManagerInterface,
} from "../types.js";
import {
  AlreadySubscribedError,
  NotConfirmedError,
  InvalidTokenError,
  CityNotFound,
} from "../errors/SubscriptionError.js";
import { createLogger } from "../logger/index.js";

const logger = createLogger("SubscriptionController");

export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionServiceInterface,
    private weatherManager: WeatherProviderManagerInterface,
  ) {}

  async subscribe(req: Request, res: Response) {
    logger.info("Subscription request received:", req.body);
    const { email, city, frequency } = req.body as SubscriptionInput;

    if (
      !email ||
      !city ||
      !frequency ||
      !["daily", "hourly"].includes(frequency)
    ) {
      return res.status(400).json({ error: "Invalid input" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    try {
      const weatherData = await this.weatherManager.getWeatherData(city);
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
      await this.subscriptionService.subscribe({ email, city, frequency });
      return res
        .status(200)
        .json({ message: "Subscription successful. Confirmation email sent." });
    } catch (err: unknown) {
      if (err instanceof AlreadySubscribedError) {
        return res.status(409).json({ error: err.message });
      } else if (err instanceof InvalidTokenError) {
        return res.status(400).json({ error: err.message });
      }
      logger.error("Subscription error:", err);
      return res.status(400).json({ error: "Invalid input" });
    }
  }

  async confirm(req: Request, res: Response): Promise<Response> {
    const { token } = req.params;

    try {
      const confirmed = await this.subscriptionService.confirm(token);
      if (confirmed) {
        return res.status(200).send("Subscription confirmed successfully");
      }
      return res.status(400).send("Invalid token");
    } catch (err: unknown) {
      if (err instanceof NotConfirmedError) {
        return res.status(400).send(err.message);
      } else if (err instanceof InvalidTokenError) {
        return res.status(400).send(err.message);
      }
      logger.error("Confirmation error:", err);
      return res.status(404).send("Token not found");
    }
  }

  async unsubscribe(req: Request, res: Response): Promise<Response> {
    const { token } = req.params;

    try {
      const unsubscribed = await this.subscriptionService.unsubscribe(token);
      if (unsubscribed) {
        return res.status(200).send("Unsubscribed and deleted successfully");
      }
      return res.status(400).send("Invalid token");
    } catch (err: unknown) {
      if (err instanceof InvalidTokenError) {
        return res.status(400).send(err.message);
      }
      logger.error("Unsubscribe error:", err);
      return res.status(500).send("Server error");
    }
  }
}
