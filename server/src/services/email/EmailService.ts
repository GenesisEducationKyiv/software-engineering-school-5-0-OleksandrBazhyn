import {
  SubscriptionFrequency,
  Subscription,
  WeatherData,
  Mailer,
  DataProvider,
  WeatherProviderManagerInterface,
} from "../../types.js";
import { Logger } from "winston";

class EmailService {
  private weatherManager: WeatherProviderManagerInterface;
  private mailer: Mailer;
  private dataProvider: DataProvider;
  private logger: Logger;

  constructor(
    mailer: Mailer,
    dataProvider: DataProvider,
    weatherManager: WeatherProviderManagerInterface,
    logger: Logger,
  ) {
    this.weatherManager = weatherManager;
    this.mailer = mailer;
    this.dataProvider = dataProvider;
    this.logger = logger;
  }

  async sendWeatherEmailsByFrequency(frequency: SubscriptionFrequency): Promise<void> {
    let subscriptions: Subscription[] | null | undefined;
    try {
      subscriptions = await this.dataProvider.getSubscriptionsByFrequency(frequency);
    } catch (err) {
      this.logger.error("Failed to get subscriptions:", err);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      this.logger.info(`No active subscriptions for frequency: ${frequency}`);
      return;
    }

    for (const sub of subscriptions) {
      try {
        const weather: WeatherData | null = await this.weatherManager.getWeatherData(sub.city);
        if (!weather) {
          this.logger.error(`No weather data found for city: ${sub.city}`);
          continue;
        }
        await this.mailer.sendWeatherEmail(sub.email, sub.city, weather, sub.token);
        this.logger.info(`Weather email sent to ${sub.email} for city ${sub.city}`);
      } catch (error) {
        this.logger.error(
          `Failed to send weather email to ${sub.email} for city ${sub.city}:`,
          error,
        );
      }
    }
  }
}

export default EmailService;
