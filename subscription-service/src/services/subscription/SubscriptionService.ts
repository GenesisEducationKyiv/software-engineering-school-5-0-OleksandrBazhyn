import {
  SubscriptionInput,
  DataProvider,
  SubscriptionServiceInterface,
  Subscription,
  SubscriptionFrequency,
  EmailRequest,
} from "../../types.js";
import { AlreadySubscribedError, InvalidTokenError } from "../../errors/SubscriptionError.js";
import { WeatherGrpcClient } from "../../clients/WeatherGrpcClient.js";
import { EmailServiceClient } from "../../clients/EmailServiceClient.js";
import crypto from "crypto";
import { Logger } from "winston";

export class SubscriptionService implements SubscriptionServiceInterface {
  constructor(
    private dataProvider: DataProvider,
    private weatherClient: WeatherGrpcClient,
    private emailClient: EmailServiceClient,
    private logger: Logger,
  ) {}

  async subscribe(subscription: SubscriptionInput): Promise<{ token: string }> {
    const existing = await this.dataProvider.checkSubscriptionExists(subscription);
    if (existing) {
      throw new AlreadySubscribedError(subscription.email, subscription.city);
    }

    const token = crypto.randomUUID();

    try {
      await this.dataProvider.insertSubscription(subscription, token, false);

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
      this.logger.error("Error creating subscription:", error);
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

  async getSubscriptionsByFrequency(frequency: SubscriptionFrequency): Promise<Subscription[]> {
    return await this.dataProvider.getSubscriptionsByFrequency(frequency);
  }

  async sendWeatherUpdateToSubscription(subscription: Subscription): Promise<void> {
    try {
      const weatherData = await this.weatherClient.getWeather(subscription.city);

      const emailRequest: EmailRequest = {
        to: subscription.email,
        subject: `Weather update for ${subscription.city}`,
        type: "weather-update",
        data: {
          city: subscription.city,
          temperature: weatherData.temperature,
          description: weatherData.description,
          humidity: weatherData.humidity,
        },
      };

      await this.emailClient.sendEmail(emailRequest);
      this.logger.info(`Weather update sent to ${subscription.email}`);
    } catch (error) {
      this.logger.error(`Failed to send weather update to ${subscription.email}:`, error);
      throw error;
    }
  }
}

export default SubscriptionService;
