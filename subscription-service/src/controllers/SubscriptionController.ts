import { Request, Response } from "express";
import { SubscriptionInput, SubscriptionServiceInterface } from "../types.js";
import {
  AlreadySubscribedError,
  NotConfirmedError,
  InvalidTokenError,
} from "../errors/SubscriptionError.js";
import { createLogger } from "../logger/index.js";
import { validateSubscriptionInput } from "../validators/SubscriptionValidator.js";

const logger = createLogger("SubscriptionController");

export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionServiceInterface) {}

  async subscribe(req: Request, res: Response): Promise<void> {
    try {
      logger.info("Subscription request received", { 
        email: req.body.email,
        city: req.body.city,
        frequency: req.body.frequency 
      });

      // Валідація через окремий валідатор
      const validationError = validateSubscriptionInput(req.body);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const subscriptionInput = req.body as SubscriptionInput;
      
      const result = await this.subscriptionService.subscribe(subscriptionInput);
      
      res.status(201).json({
        message: "Subscription successful. Confirmation email sent.",
        token: result.token, // Можна повернути для тестування
      });
      
    } catch (error) {
      this.handleSubscriptionError(error, res);
    }
  }

  async confirm(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      
      if (!token) {
        res.status(400).json({ error: "Token is required" });
        return;
      }

      const confirmed = await this.subscriptionService.confirm(token);
      
      if (confirmed) {
        res.status(200).json({ 
          message: "Subscription confirmed successfully",
          confirmed: true 
        });
      } else {
        res.status(400).json({ error: "Invalid token" });
      }
      
    } catch (error) {
      this.handleConfirmationError(error, res);
    }
  }

  async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      
      if (!token) {
        res.status(400).json({ error: "Token is required" });
        return;
      }

      const unsubscribed = await this.subscriptionService.unsubscribe(token);
      
      if (unsubscribed) {
        res.status(200).json({ 
          message: "Unsubscribed successfully",
          unsubscribed: true 
        });
      } else {
        res.status(400).json({ error: "Invalid token" });
      }
      
    } catch (error) {
      this.handleUnsubscribeError(error, res);
    }
  }

  private handleSubscriptionError(error: unknown, res: Response): void {
    if (error instanceof AlreadySubscribedError) {
      res.status(409).json({ error: error.message });
    } else if (error instanceof InvalidTokenError) {
      res.status(400).json({ error: error.message });
    } else {
      logger.error("Subscription error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private handleConfirmationError(error: unknown, res: Response): void {
    if (error instanceof NotConfirmedError || error instanceof InvalidTokenError) {
      res.status(400).json({ error: error.message });
    } else {
      logger.error("Confirmation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private handleUnsubscribeError(error: unknown, res: Response): void {
    if (error instanceof InvalidTokenError) {
      res.status(400).json({ error: error.message });
    } else {
      logger.error("Unsubscribe error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}