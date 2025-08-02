import cron from "node-cron";
import { SubscriptionService } from "../subscription/SubscriptionService.js";
import { Logger } from "winston";

export class WeatherScheduler {
  constructor(
    private subscriptionService: SubscriptionService,
    private logger: Logger,
  ) {}

  startScheduler(): void {
    // Daily at 8 AM
    cron.schedule("0 8 * * *", async () => {
      try {
        await this.sendWeatherUpdates("daily");
        this.logger.info("Daily weather updates sent");
      } catch (error) {
        this.logger.error("Failed to send daily updates:", error);
      }
    });

    // Hourly
    cron.schedule("0 * * * *", async () => {
      try {
        await this.sendWeatherUpdates("hourly");
        this.logger.info("Hourly weather updates sent");
      } catch (error) {
        this.logger.error("Failed to send hourly updates:", error);
      }
    });
  }

  private async sendWeatherUpdates(frequency: "daily" | "hourly"): Promise<void> {
    try {
      const subscriptions = await this.subscriptionService.getSubscriptionsByFrequency(frequency);

      for (const subscription of subscriptions) {
        try {
          await this.subscriptionService.sendWeatherUpdateToSubscription(subscription);
        } catch (error) {
          this.logger.error(`Failed to send update for ${subscription.email}:`, error);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get ${frequency} subscriptions:`, error);
    }
  }
}
