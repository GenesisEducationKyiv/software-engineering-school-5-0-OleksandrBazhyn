import { SubscriptionInput, Mailer } from "../types.js";
import DataProvider from "./DataProvider.js";

class SubscriptionService {
  private mailer: Mailer;

  constructor(mailer: Mailer) {
    this.mailer = mailer;
  }

  async subscribe(subscription: SubscriptionInput): Promise<{ token: string }> {
    const existing = await DataProvider.checkSubscriptionExists(subscription);
    if (existing) {
      throw new Error("Email already subscribed");
    }
    const token = crypto.randomUUID();
    try {
      await DataProvider.insertSubscription(subscription, token, false);
      await this.mailer.sendConfirmationEmail(
        subscription.email,
        subscription.city,
        token,
      );
      return { token };
    } catch (error) {
      console.error("Error inserting subscription:", error);
      throw new Error("Failed to subscribe");
    }
  }

  async confirm(token: string): Promise<boolean> {
    const updated = await DataProvider.updateSubscriptionStatus(token, true);
    if (!updated) {
      throw new Error("Invalid token or subscription already confirmed");
    }
    return true;
  }

  async unsubscribe(token: string): Promise<boolean> {
    const deleted = await DataProvider.deleteSubscription(token);
    if (!deleted) {
      throw new Error("Invalid token or subscription not found");
    }
    return true;
  }
}

export default SubscriptionService;
