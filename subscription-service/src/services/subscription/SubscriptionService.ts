import {
  SubscriptionInput,
  Mailer,
  DataProvider,
  SubscriptionServiceInterface,
} from "../../types.js";
import { AlreadySubscribedError, InvalidTokenError } from "../../errors/SubscriptionError.js";
import { Logger } from "winston";
import crypto from "crypto";
import { WeatherGrpcClient } from "../../clients/WeatherGrpcClient";
import { EmailServiceClient, EmailRequest } from "../../clients/EmailServiceClient";
import { logger } from "../../logger";

export class SubscriptionService implements SubscriptionServiceInterface {
  private dataProvider: DataProvider;
  private weatherClient: WeatherGrpcClient;
  private emailClient: EmailServiceClient;
  private logger: Logger;

  constructor(
    dataProvider: DataProvider,
    weatherClient: WeatherGrpcClient,
    emailClient: EmailServiceClient,
    logger: Logger,
  ) {
    this.dataProvider = dataProvider;
    this.weatherClient = weatherClient;
    this.emailClient = emailClient;
    this.logger = logger;
  }

  // Remove mailer dependency - now uses emailClient
  async subscribe(subscription: SubscriptionInput): Promise<{ token: string }> {
    const existing = await this.dataProvider.checkSubscriptionExists(subscription);
    if (existing) {
      throw new AlreadySubscribedError(subscription.email, subscription.city);
    }
    const token = crypto.randomUUID();
    try {
      this.logger.info(`Inserting subscription for ${subscription.email} in ${subscription.city}`);
      await this.dataProvider.insertSubscription(subscription, token, false);

      // Use email service instead of direct mailer
      const emailRequest: EmailRequest = {
        to: subscription.email,
        subject: `Confirm your weather subscription for ${subscription.city}`,
        type: "confirmation",
        data: {
          confirmationLink: `${process.env.FRONTEND_URL}/confirm/${token}`,
        },
      };
      await this.emailClient.sendEmail(emailRequest);

      return { token };
    } catch (error) {
      this.logger.error("Error inserting subscription:", error);
      throw new Error("Failed to subscribe");
    }
  }

  async confirm(token: string): Promise<boolean> {
    this.logger.info(`Confirming subscription with token: ${token}`);
    const updated = await this.dataProvider.updateSubscriptionStatus(token, true);
    if (!updated) {
      throw new InvalidTokenError();
    }
    return true;
  }

  async unsubscribe(token: string): Promise<boolean> {
    this.logger.info(`Unsubscribing with token: ${token}`);
    const deleted = await this.dataProvider.deleteSubscription(token);
    if (!deleted) {
      throw new InvalidTokenError();
    }
    return true;
  }

  async sendWeatherUpdateToSubscription(subscription: Subscription): Promise<void> {
    try {
      // Get weather data via gRPC
      const weatherData = await this.weatherClient.getWeather(subscription.city);

      // Send email request to email service queue
      const emailRequest: EmailRequest = {
        to: subscription.email,
        subject: `Weather Update for ${subscription.city}`,
        type: "weather",
        data: {
          weatherData: {
            city: subscription.city,
            temperature: weatherData.temperature,
            description: weatherData.description,
            humidity: weatherData.humidity,
            windSpeed: weatherData.windSpeed,
            pressure: weatherData.pressure,
          },
        },
      };

      const success = await this.emailClient.sendEmail(emailRequest);
      if (success) {
        logger.info(`Weather update queued for ${subscription.email} in ${subscription.city}`);
      } else {
        logger.error(`Failed to queue weather update for ${subscription.email}`);
      }
    } catch (error) {
      logger.error(`Failed to send weather update for subscription ${subscription.id}:`, error);
      throw error;
    }
  }

  async confirmSubscription(confirmationToken: string): Promise<boolean> {
    const success = await this.subscriptionDataProvider.confirmSubscription(confirmationToken);

    if (success) {
      const subscription =
        await this.subscriptionDataProvider.getSubscriptionByToken(confirmationToken);
      if (subscription) {
        // Send confirmation email via email service
        const emailRequest: EmailRequest = {
          to: subscription.email,
          subject: "Weather Subscription Confirmed!",
          type: "confirmation",
          data: {
            confirmationLink: `${process.env.FRONTEND_URL}/confirmed`,
          },
        };
        await this.emailClient.sendEmail(emailRequest);
      }
    }

    return success;
  }

  async unsubscribe(unsubscribeToken: string): Promise<boolean> {
    const subscription =
      await this.subscriptionDataProvider.getSubscriptionByUnsubscribeToken(unsubscribeToken);
    if (!subscription) {
      return false;
    }

    const success = await this.subscriptionDataProvider.deleteSubscription(subscription.id);

    if (success) {
      // Send unsubscribe confirmation email
      const emailRequest: EmailRequest = {
        to: subscription.email,
        subject: "Successfully Unsubscribed from Weather Updates",
        type: "unsubscribe",
        data: {
          unsubscribeLink: `${process.env.FRONTEND_URL}/unsubscribed`,
        },
      };
      await this.emailClient.sendEmail(emailRequest);
    }

    return success;
  }
}

export default SubscriptionService;
