import { Logger } from "winston";
import { WeatherData, ConfirmationPayload, WeatherPayload } from "../types.js";
import { Request, Response } from "express";
import { EmailQueue } from "../services/emailQueue.js";

export class EmailController {
  private logger: Logger;
  private emailQueue: EmailQueue;

  constructor(logger: Logger, emailQueue: EmailQueue) {
    this.logger = logger;
    this.emailQueue = emailQueue;
  }

  private isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  private validateConfirmationPayload(body: ConfirmationPayload): string | null {
    if (!body.email || !this.isValidEmail(body.email)) {
      return "Invalid email";
    }
    if (!body.city) {
      return "Missing city";
    }
    if (!body.confirmUrl) {
      return "Missing confirmUrl";
    }
    return null;
  }

  private validateWeatherPayload(body: WeatherPayload): string | null {
    if (!body.email || !this.isValidEmail(body.email)) {
      return "Invalid email";
    }
    if (!body.city) {
      return "Missing city";
    }
    if (body.temperature === null || body.temperature === undefined) {
      return "Missing temperature";
    }
    if (body.humidity === null || body.humidity === undefined) {
      return "Missing humidity";
    }
    if (!body.description) {
      return "Missing description";
    }
    if (!body.unsubscribeUrl) {
      return "Missing unsubscribeUrl";
    }
    return null;
  }

  async sendConfirmationEmail(req: Request, res: Response): Promise<void> {
    try {
      const error = this.validateConfirmationPayload(req.body);
      if (error) {
        this.logger.error(`Confirmation email validation failed: ${error}`);
        this.logger.debug(
          `Confirmation email validation failed: ${error}. Request body: ${JSON.stringify(req.body)}`,
        );
        res.status(400).json({ error });
        return;
      }
      const { email, city, confirmUrl } = req.body;
      this.emailQueue.enqueue({ type: "confirmation", email, city, confirmUrl });
      res.status(202).json({ message: "Confirmation email queued" });
    } catch (err) {
      this.logger.error("Failed to send confirmation email", { error: err });
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async sendWeatherEmail(req: Request, res: Response): Promise<void> {
    try {
      const error = this.validateWeatherPayload(req.body);
      if (error) {
        this.logger.warn(`Weather email validation failed: ${error}`);
        this.logger.debug(
          `Weather email validation failed: ${error}. Request body: ${JSON.stringify(req.body)}`,
        );
        res.status(400).json({ error });
        return;
      }
      const { email, city, temperature, humidity, description, unsubscribeUrl } = req.body;
      const weatherData: WeatherData = {
        city,
        temperature,
        humidity,
        description,
      };
      this.emailQueue.enqueue({
        type: "weather-update",
        email,
        weatherData,
        unsubscribeUrl,
      });
      res.status(202).json({ message: "Weather email queued" });
    } catch (err) {
      this.logger.error("Failed to send weather email", { error: err });
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
