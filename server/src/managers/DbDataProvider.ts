import { SubscriptionFrequency, Subscription, SubscriptionInput, DataProvider } from "../types.js";
import db from "../../db/knex.js";

class DbDataProvider implements DataProvider {
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
    } catch (error) {
      console.error("Error inserting subscription:", error);
      throw new Error("Failed to insert subscription");
    }
  }

  async updateSubscriptionStatus(token: string, isActive: boolean): Promise<boolean> {
    const updatedRows = await db<Subscription>("subscriptions")
      .where({ token })
      .update({ is_active: true });

    if (updatedRows === 0) {
      console.warn(`No subscription found with token: ${token}`);
      return false;
    }

    console.log(`Subscription with token ${token} updated to active status: ${isActive}`);
    return true;
  }

  async deleteSubscription(token: string): Promise<boolean> {
    const deletedRows = await db<Subscription>("subscriptions").where({ token }).del();

    if (deletedRows === 0) {
      console.warn(`No subscription found with token: ${token}`);
      return false;
    }

    console.log(`Subscription with token ${token} deleted successfully`);
    return true;
  }
}

export default new DbDataProvider();
