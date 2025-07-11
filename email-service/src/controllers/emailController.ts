import { Logger } from "winston";
import { Mailer, WeatherData, ConfirmationPayload, WeatherPayload } from "../types.js";
import { Request, Response } from "express";

export class EmailController {
  private logger: Logger;
  private emailService: Mailer;

  constructor(logger: Logger, emailService: Mailer) {
    this.logger = logger;
    this.emailService = emailService;
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
      await this.emailService.sendConfirmationEmail(email, city, confirmUrl);
      this.logger.info(`Confirmation email sent to ${email} for city ${city}`);
      res.status(200).json({ message: "Confirmation email was sent" });
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
      await this.emailService.sendWeatherEmail(email, weatherData, unsubscribeUrl);
      this.logger.info(`Weather email sent to ${email} for city ${city}`);
      res.status(200).json({ message: "Weather email sent" });
    } catch (err) {
      this.logger.error("Failed to send weather email", { error: err });
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
