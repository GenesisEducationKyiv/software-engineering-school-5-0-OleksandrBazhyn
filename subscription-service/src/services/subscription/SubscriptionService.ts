import type {
  SubscriptionInput,
  DataProvider,
  SubscriptionServiceInterface,
  WeatherServiceClient,
  EmailServiceClient,
} from "../../types.js";
import {
  AlreadySubscribedError,
  InvalidTokenError,
  CityNotFound,
  WeatherServiceError,
  EmailServiceError,
} from "../../errors/SubscriptionError.js";
import type { Logger } from "winston";
import crypto from "crypto";

class SubscriptionService implements SubscriptionServiceInterface {
  private dataProvider: DataProvider;
  private weatherClient: WeatherServiceClient;
  private emailClient: EmailServiceClient;
  private logger: Logger;

  constructor(
    dataProvider: DataProvider,
    weatherClient: WeatherServiceClient,
    emailClient: EmailServiceClient,
    logger: Logger,
  ) {
    this.dataProvider = dataProvider;
    this.weatherClient = weatherClient;
    this.emailClient = emailClient;
    this.logger = logger;
  }

  async subscribe(subscription: SubscriptionInput): Promise<{ token: string }> {
    const existing = await this.dataProvider.checkSubscriptionExists(subscription);
    if (existing) {
      throw new AlreadySubscribedError(subscription.email, subscription.city);
    }

    try {
      const weatherData = await this.weatherClient.getWeatherData(subscription.city);
      if (!weatherData) {
        throw new CityNotFound();
      }
    } catch (error) {
      this.logger.error(`Weather service error for city ${subscription.city}:`, error);
      throw new WeatherServiceError("Failed to validate city");
    }

    const token = crypto.randomUUID();
    try {
      this.logger.info(`Creating subscription for ${subscription.email} in ${subscription.city}`);
      await this.dataProvider.insertSubscription(subscription, token, false);

      await this.emailClient.sendConfirmationEmail(subscription.email, subscription.city, token);

      this.logger.info(`Subscription created successfully for ${subscription.email}`);
      return { token };
    } catch (error) {
      this.logger.error("Error creating subscription:", error);
      if (error instanceof Error && error.message.includes("email")) {
        throw new EmailServiceError("Failed to send confirmation email");
      }
      throw new Error("Failed to create subscription");
    }
  }

  async confirm(token: string): Promise<boolean> {
    this.logger.info(`Confirming subscription with token: ${token}`);
    try {
      const updated = await this.dataProvider.updateSubscriptionStatus(token, true);
      if (!updated) {
        throw new InvalidTokenError();
      }
      this.logger.info(`Subscription confirmed successfully for token: ${token}`);
      return true;
    } catch (error) {
      this.logger.error("Error confirming subscription:", error);
      if (error instanceof InvalidTokenError) {
        throw error;
      }
      throw new Error("Failed to confirm subscription");
    }
  }

  async unsubscribe(token: string): Promise<boolean> {
    this.logger.info(`Unsubscribing with token: ${token}`);
    try {
      const deleted = await this.dataProvider.deleteSubscription(token);
      if (!deleted) {
        throw new InvalidTokenError();
      }
      this.logger.info(`Subscription cancelled successfully for token: ${token}`);
      return true;
    } catch (error) {
      this.logger.error("Error unsubscribing:", error);
      if (error instanceof InvalidTokenError) {
        throw error;
      }
      throw new Error("Failed to unsubscribe");
    }
  }

  async getSubscriptionsByFrequency(frequency: "daily" | "hourly") {
    try {
      return await this.dataProvider.getSubscriptionsByFrequency(frequency);
    } catch (error) {
      this.logger.error("Error getting subscriptions by frequency:", error);
      throw new Error("Failed to get subscriptions");
    }
  }
}

export default SubscriptionService;
