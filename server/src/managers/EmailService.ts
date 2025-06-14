import {
  SubscriptionFrequency,
  Subscription,
  WeatherData,
  Mailer,
} from "../types.js";
import WeatherManager from "./WeatherManager.js";
import DataProvider from "./DataProvider.js";

class EmailService {
  private weatherManager: WeatherManager;
  private mailer: Mailer;

  constructor(mailer: Mailer) {
    this.weatherManager = new WeatherManager();
    this.mailer = mailer;
  }

  async sendWeatherEmailsByFrequency(
    frequency: SubscriptionFrequency,
  ): Promise<void> {
    const subscriptions: Subscription[] =
      await DataProvider.getSubscriptionsByFrequency(frequency);

    if (subscriptions.length === 0) {
      console.log(`No active subscriptions for frequency: ${frequency}`);
      return;
    }

    for (const sub of subscriptions) {
      try {
        const weather: WeatherData | null =
          await this.weatherManager.getWeatherData(sub.city);
        if (!weather) {
          console.error(`No weather data found for city: ${sub.city}`);
          continue;
        }
        await this.mailer.sendWeatherEmail(
          sub.email,
          sub.city,
          weather,
          sub.token,
        );
        console.log(`Weather email sent to ${sub.email} for city ${sub.city}`);
      } catch (error) {
        console.error(
          `Failed to send weather email to ${sub.email} for city ${sub.city}:`,
          error,
        );
      }
    }
  }
}

export default EmailService;
