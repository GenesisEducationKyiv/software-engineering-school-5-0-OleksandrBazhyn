import cron from "node-cron";
import type { Logger } from "winston";
import type {
  SchedulerServiceInterface,
  WeatherServiceClient,
  EmailServiceClient,
} from "../../types.js";
import type SubscriptionService from "../subscription/SubscriptionService.js";

class SchedulerService implements SchedulerServiceInterface {
  private logger: Logger;
  private subscriptionService: SubscriptionService;
  private weatherClient: WeatherServiceClient;
  private emailClient: EmailServiceClient;
  private hourlyTask?: cron.ScheduledTask;
  private dailyTask?: cron.ScheduledTask;

  constructor(
    subscriptionService: SubscriptionService,
    weatherClient: WeatherServiceClient,
    emailClient: EmailServiceClient,
    logger: Logger,
  ) {
    this.logger = logger;
    this.subscriptionService = subscriptionService;
    this.weatherClient = weatherClient;
    this.emailClient = emailClient;
  }

  start(): void {
    this.logger.info("Starting scheduler service");

    // Hourly (at the beginning of each hour)
    this.hourlyTask = cron.schedule("0 * * * *", async () => {
      await this.sendWeatherEmailsByFrequency("hourly");
      this.logger.info("Hourly weather emails sent.");
    });

    // Every day at 8:00 am
    this.dailyTask = cron.schedule("0 8 * * *", async () => {
      await this.sendWeatherEmailsByFrequency("daily");
      this.logger.info("Daily weather emails sent.");
    });

    this.logger.info("Scheduler service started successfully");
  }

  stop(): void {
    this.logger.info("Stopping scheduler service");

    if (this.hourlyTask) {
      this.hourlyTask.stop();
      this.hourlyTask = undefined;
    }

    if (this.dailyTask) {
      this.dailyTask.stop();
      this.dailyTask = undefined;
    }

    this.logger.info("Scheduler service stopped");
  }

  private async sendWeatherEmailsByFrequency(frequency: "daily" | "hourly"): Promise<void> {
    try {
      this.logger.info(`Sending ${frequency} weather emails`);

      const subscriptions = await this.subscriptionService.getSubscriptionsByFrequency(frequency);

      if (subscriptions.length === 0) {
        this.logger.info(`No active subscriptions for frequency: ${frequency}`);
        return;
      }

      this.logger.info(`Found ${subscriptions.length} active subscriptions for ${frequency}`);

      for (const subscription of subscriptions) {
        try {
          const weatherData = await this.weatherClient.getWeatherData(subscription.city);

          if (!weatherData) {
            this.logger.warn(`No weather data for city: ${subscription.city}`);
            continue;
          }

          await this.emailClient.sendWeatherEmail(
            subscription.email,
            subscription.city,
            weatherData,
            subscription.token,
          );

          this.logger.info(`Weather email sent to ${subscription.email} for ${subscription.city}`);
        } catch (error) {
          this.logger.error(`Failed to send weather email to ${subscription.email}:`, error);
        }
      }

      this.logger.info(`Finished sending ${frequency} weather emails`);
    } catch (error) {
      this.logger.error(`Error in sendWeatherEmailsByFrequency(${frequency}):`, error);
    }
  }
}

export default SchedulerService;
