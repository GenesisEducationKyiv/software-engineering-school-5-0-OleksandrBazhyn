import {
  SubscriptionInput,
  DataProvider,
  SubscriptionServiceInterface,
  Subscription,
  SubscriptionFrequency,
  EmailRequest,
  MessageBroker,
} from "../../types.js";
import { AlreadySubscribedError, InvalidTokenError } from "../../errors/SubscriptionError.js";
import { WeatherGrpcClient } from "../../clients/WeatherGrpcClient.js";
import { EmailServiceClient } from "../../clients/EmailServiceClient.js";
import {
  subscriptionsTotal,
  subscriptionConfirmationsTotal,
  emailsSentTotal,
} from "../../metrics/index.js";
import crypto from "crypto";
import { Logger } from "winston";

export class SubscriptionService implements SubscriptionServiceInterface {
  constructor(
    private dataProvider: DataProvider,
    private weatherClient: WeatherGrpcClient,
    private emailClient: EmailServiceClient,
    private logger: Logger,
    private messageBroker: MessageBroker,
  ) {}

  async subscribe(subscription: SubscriptionInput): Promise<{ token: string }> {
    const startTime = Date.now();

    this.logger.info("Subscription request received", {
      email: subscription.email,
      city: subscription.city,
      frequency: subscription.frequency,
      requestId: crypto.randomUUID(),
    });

    try {
      const existing = await this.dataProvider.checkSubscriptionExists(subscription);
      if (existing) {
        subscriptionsTotal.inc({ status: "already_exists", city: subscription.city });
        this.logger.warn("Subscription already exists", {
          email: subscription.email,
          city: subscription.city,
        });
        throw new AlreadySubscribedError(subscription.email, subscription.city);
      }

      const token = crypto.randomUUID();

      await this.dataProvider.insertSubscription(subscription, token, false);

      const emailRequest: EmailRequest = {
        to: subscription.email,
        subject: `Confirm your weather subscription for ${subscription.city}`,
        type: "confirmation",
        data: {
          confirmationLink: `${process.env.FRONTEND_URL}/confirm/${token}`,
        },
      };

      try {
        await this.emailClient.sendEmail(emailRequest);
        emailsSentTotal.inc({ type: "confirmation", status: "success" });
        this.logger.info("Confirmation email sent successfully", {
          email: subscription.email,
          city: subscription.city,
        });
      } catch (emailError) {
        emailsSentTotal.inc({ type: "confirmation", status: "failed" });
        this.logger.error("Failed to send confirmation email", {
          email: subscription.email,
          error: emailError,
        });
        throw emailError;
      }

      subscriptionsTotal.inc({ status: "created", city: subscription.city });

      const duration = Date.now() - startTime;
      this.logger.info("Subscription created successfully", {
        email: subscription.email,
        city: subscription.city,
        duration,
        token,
      });

      return { token };
    } catch (error) {
      const duration = Date.now() - startTime;
      subscriptionsTotal.inc({ status: "failed", city: subscription.city });

      this.logger.error("Error creating subscription", {
        email: subscription.email,
        city: subscription.city,
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof AlreadySubscribedError) {
        throw error;
      }
      throw new Error("Failed to subscribe");
    }
  }

  async confirm(token: string): Promise<boolean> {
    const startTime = Date.now();

    this.logger.info("Subscription confirmation request", { token });

    try {
      const updated = await this.dataProvider.updateSubscriptionStatus(token, true);
      if (!updated) {
        subscriptionConfirmationsTotal.inc({ status: "invalid_token" });
        this.logger.warn("Invalid confirmation token", { token });
        throw new InvalidTokenError();
      }

      const subscription = await this.dataProvider.getSubscriptionByToken(token);
      if (subscription) {
        await this.messageBroker.publish(
          "subscription_confirmed",
          JSON.stringify({
            type: "subscription_confirmed",
            email: subscription.email,
            city: subscription.city,
            frequency: subscription.frequency,
          }),
        );

        subscriptionConfirmationsTotal.inc({ status: "success" });

        const duration = Date.now() - startTime;
        this.logger.info("Subscription confirmed successfully", {
          email: subscription.email,
          city: subscription.city,
          duration,
        });
      }

      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      subscriptionConfirmationsTotal.inc({ status: "failed" });

      this.logger.error("Error confirming subscription", {
        token,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof InvalidTokenError) {
        throw error;
      }
      throw new Error("Failed to confirm subscription");
    }
  }

  async unsubscribe(token: string): Promise<boolean> {
    this.logger.info(`Unsubscribing with token: ${token}`);
    const subscription = await this.dataProvider.getSubscriptionByToken(token);
    const deleted = await this.dataProvider.deleteSubscription(token);
    if (!deleted) {
      throw new InvalidTokenError();
    }

    if (subscription) {
      await this.messageBroker.publish(
        "subscription_unsubscribed",
        JSON.stringify({
          type: "subscription_unsubscribed",
          email: subscription.email,
          city: subscription.city,
        }),
      );
    }

    return true;
  }

  async getSubscriptionsByFrequency(frequency: SubscriptionFrequency): Promise<Subscription[]> {
    return await this.dataProvider.getSubscriptionsByFrequency(frequency);
  }

  async sendWeatherUpdateToSubscription(subscription: Subscription): Promise<void> {
    const startTime = Date.now();

    this.logger.debug("Sending weather update to subscription", {
      email: subscription.email,
      city: subscription.city,
      frequency: subscription.frequency,
    });

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

      const duration = Date.now() - startTime;
      this.logger.info("Weather update sent successfully", {
        email: subscription.email,
        city: subscription.city,
        temperature: weatherData.temperature,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error("Failed to send weather update", {
        email: subscription.email,
        city: subscription.city,
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }
}

export default SubscriptionService;
