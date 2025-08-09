import cron from "node-cron";
import { SubscriptionService } from "../subscription/SubscriptionService.js";
import { scheduledJobsTotal, scheduledJobDuration } from "../../metrics/index.js";
import { Logger } from "winston";

export class WeatherScheduler {
  constructor(
    private subscriptionService: SubscriptionService,
    private logger: Logger,
  ) {}

  startScheduler(): void {
    this.logger.info("Starting weather scheduler");

    // Daily at 8 AM
    cron.schedule("0 8 * * *", async () => {
      const startTime = Date.now();
      try {
        this.logger.info("Starting daily weather updates job");
        await this.sendWeatherUpdates("daily");

        const duration = (Date.now() - startTime) / 1000;
        scheduledJobsTotal.inc({ job_type: "daily_weather", status: "success" });
        scheduledJobDuration.observe({ job_type: "daily_weather" }, duration);

        this.logger.info("Daily weather updates completed successfully", { duration });
      } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        scheduledJobsTotal.inc({ job_type: "daily_weather", status: "failed" });
        scheduledJobDuration.observe({ job_type: "daily_weather" }, duration);

        this.logger.error("Failed to send daily updates", {
          duration,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    });

    // Hourly
    cron.schedule("0 * * * *", async () => {
      const startTime = Date.now();
      try {
        this.logger.info("Starting hourly weather updates job");
        await this.sendWeatherUpdates("hourly");

        const duration = (Date.now() - startTime) / 1000;
        scheduledJobsTotal.inc({ job_type: "hourly_weather", status: "success" });
        scheduledJobDuration.observe({ job_type: "hourly_weather" }, duration);

        this.logger.info("Hourly weather updates completed successfully", { duration });
      } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        scheduledJobsTotal.inc({ job_type: "hourly_weather", status: "failed" });
        scheduledJobDuration.observe({ job_type: "hourly_weather" }, duration);

        this.logger.error("Failed to send hourly updates", {
          duration,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    });

    this.logger.info("Weather scheduler started successfully");
  }

  private async sendWeatherUpdates(frequency: "daily" | "hourly"): Promise<void> {
    try {
      this.logger.debug("Fetching subscriptions for frequency", { frequency });
      const subscriptions = await this.subscriptionService.getSubscriptionsByFrequency(frequency);

      this.logger.info("Processing weather updates", {
        frequency,
        subscriptionCount: subscriptions.length,
      });

      let successCount = 0;
      let errorCount = 0;

      for (const subscription of subscriptions) {
        try {
          await this.subscriptionService.sendWeatherUpdateToSubscription(subscription);
          successCount++;

          this.logger.debug("Weather update sent successfully", {
            email: subscription.email,
            city: subscription.city,
          });
        } catch (error) {
          errorCount++;

          this.logger.error("Failed to send weather update", {
            email: subscription.email,
            city: subscription.city,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      this.logger.info("Weather updates batch completed", {
        frequency,
        total: subscriptions.length,
        success: successCount,
        errors: errorCount,
      });
    } catch (error) {
      this.logger.error("Failed to get subscriptions for weather updates", {
        frequency,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
