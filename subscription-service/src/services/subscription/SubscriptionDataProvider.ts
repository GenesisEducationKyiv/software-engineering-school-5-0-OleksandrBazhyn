import type {
  SubscriptionFrequency,
  Subscription,
  SubscriptionInput,
  DataProvider,
} from "../../types.js";
import db from "../../../db/knex.js";

class SubscriptionDataProvider implements DataProvider {
  async getSubscriptionsByFrequency(frequency: SubscriptionFrequency): Promise<Subscription[]> {
    const subscriptions: Subscription[] = await db<Subscription>("subscriptions")
      .where("frequency", frequency)
      .andWhere("is_active", true);

    if (subscriptions.length === 0) {
      console.warn(`No active subscriptions found for frequency: ${frequency}`);
    }

    return subscriptions;
  }

  async checkSubscriptionExists(subscription: SubscriptionInput): Promise<boolean> {
    const existing: Subscription | undefined = await db<Subscription>("subscriptions")
      .where("email", subscription.email)
      .andWhere("city", subscription.city)
      .andWhere("frequency", subscription.frequency)
      .first();

    if (existing) {
      console.warn(
        `Subscription already exists for ${subscription.email} in ${subscription.city} with frequency ${subscription.frequency}`,
      );
      return true;
    }

    return false;
  }

  async insertSubscription(
    subscription: SubscriptionInput,
    _token: string,
    _is_active = false,
  ): Promise<void> {
    try {
      console.log("Inserting subscription into database:", subscription);
      await db<Subscription>("subscriptions").insert({
        ...subscription,
        token: _token,
        is_active: _is_active,
      });
      console.log("Subscription inserted successfully");
    } catch (error) {
      console.error("Error inserting subscription:", error);
      throw error;
    }
  }

  async updateSubscriptionStatus(token: string, isActive: boolean): Promise<boolean> {
    try {
      console.log(`Updating subscription status for token: ${token} to ${isActive}`);
      const updated = await db<Subscription>("subscriptions").where("token", token).update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      });
      console.log(`Subscription status updated, affected rows: ${updated}`);
      return updated > 0;
    } catch (error) {
      console.error("Error updating subscription status:", error);
      throw error;
    }
  }

  async deleteSubscription(token: string): Promise<boolean> {
    try {
      console.log(`Deleting subscription with token: ${token}`);
      const deleted = await db<Subscription>("subscriptions").where("token", token).del();
      console.log(`Subscription deleted, affected rows: ${deleted}`);
      return deleted > 0;
    } catch (error) {
      console.error("Error deleting subscription:", error);
      throw error;
    }
  }
}

export default SubscriptionDataProvider;
