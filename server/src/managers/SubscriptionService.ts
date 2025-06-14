import { SubscriptionInput, Mailer, DataProvider } from "../types.js";

class SubscriptionService {
  private mailer: Mailer;
  private dataProvider: DataProvider;

  constructor(mailer: Mailer, dataProvider: DataProvider) {
    this.mailer = mailer;
    this.dataProvider = dataProvider;
  }

  async subscribe(subscription: SubscriptionInput): Promise<{ token: string }> {
    const existing = await this.dataProvider.checkSubscriptionExists(subscription);
    if (existing) {
      throw new Error("Email already subscribed");
    }
    const token = crypto.randomUUID();
    try {
      await this.dataProvider.insertSubscription(subscription, token, false);
      await this.mailer.sendConfirmationEmail(subscription.email, subscription.city, token);
      return { token };
    } catch (error) {
      console.error("Error inserting subscription:", error);
      throw new Error("Failed to subscribe");
    }
  }

  async confirm(token: string): Promise<boolean> {
    const updated = await this.dataProvider.updateSubscriptionStatus(token, true);
    if (!updated) {
      throw new Error("Invalid token or subscription already confirmed");
    }
    return true;
  }

  async unsubscribe(token: string): Promise<boolean> {
    const deleted = await this.dataProvider.deleteSubscription(token);
    if (!deleted) {
      throw new Error("Invalid token or subscription not found");
    }
    return true;
  }
}

export default SubscriptionService;
