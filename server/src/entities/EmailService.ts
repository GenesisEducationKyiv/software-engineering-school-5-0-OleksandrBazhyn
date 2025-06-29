import {
  SubscriptionFrequency,
  Subscription,
  WeatherData,
  Mailer,
  DataProvider,
} from "../types.js";
import { WeatherProviderManager } from "./WeatherProviderManager.js";

class EmailService {
  private weatherManager: WeatherProviderManager;
  private mailer: Mailer;
  private dataProvider: DataProvider;

  constructor(mailer: Mailer, dataProvider: DataProvider) {
    this.weatherManager = WeatherProviderManager.getInstance();
    this.mailer = mailer;
    this.dataProvider = dataProvider;
  }

  async sendWeatherEmailsByFrequency(frequency: SubscriptionFrequency): Promise<void> {
    let subscriptions: Subscription[] | null | undefined;
    try {
      subscriptions = await this.dataProvider.getSubscriptionsByFrequency(frequency);
    } catch (err) {
      console.error("Failed to get subscriptions:", err);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No active subscriptions for frequency: ${frequency}`);
      return;
    }

    for (const sub of subscriptions) {
      try {
        const weather: WeatherData | null = await this.weatherManager
          .getProvider()
          .getWeatherData(sub.city);
        if (!weather) {
          console.error(`No weather data found for city: ${sub.city}`);
          continue;
        }
        await this.mailer.sendWeatherEmail(sub.email, sub.city, weather, sub.token);
        console.log(`Weather email sent to ${sub.email} for city ${sub.city}`);
      } catch (error) {
        console.error(`Failed to send weather email to ${sub.email} for city ${sub.city}:`, error);
      }
    }
  }
}

export default EmailService;
