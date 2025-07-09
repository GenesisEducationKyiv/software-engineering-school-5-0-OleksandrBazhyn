import {
  SubscriptionInput,
  Mailer,
  DataProvider,
  SubscriptionServiceInterface,
} from "../../types.js";
import {
  AlreadySubscribedError,
  InvalidTokenError,
} from "../../errors/SubscriptionError.js";
import { Logger } from "winston";
import crypto from "crypto";

class SubscriptionService implements SubscriptionServiceInterface {
  private mailer: Mailer;
  private dataProvider: DataProvider;
  private logger: Logger;

  constructor(mailer: Mailer, dataProvider: DataProvider, logger: Logger) {
    this.mailer = mailer;
    this.dataProvider = dataProvider;
    this.logger = logger;
  }

  async subscribe(subscription: SubscriptionInput): Promise<{ token: string }> {
    const existing =
      await this.dataProvider.checkSubscriptionExists(subscription);
    if (existing) {
      throw new AlreadySubscribedError(subscription.email, subscription.city);
    }
    const token = crypto.randomUUID();
    try {
      this.logger.info(
        `Inserting subscription for ${subscription.email} in ${subscription.city}`,
      );
      await this.dataProvider.insertSubscription(subscription, token, false);
      await this.mailer.sendConfirmationEmail(
        subscription.email,
        subscription.city,
        token,
      );
      return { token };
    } catch (error) {
      this.logger.error("Error inserting subscription:", error);
      throw new Error("Failed to subscribe");
    }
  }

  async confirm(token: string): Promise<boolean> {
    this.logger.info(`Confirming subscription with token: ${token}`);
    const updated = await this.dataProvider.updateSubscriptionStatus(
      token,
      true,
    );
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
}

export default SubscriptionService;
