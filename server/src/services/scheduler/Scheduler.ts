import cron from "node-cron";
import EmailService from "./EmailService.js";
import { Mailer, DataProvider } from "../../types.js";
import { WeatherProviderManager } from "../weather/WeatherProviderManager.js";
import { Logger } from "winston";
import { createLogger } from "../../logger/index.js";

class Scheduler {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || createLogger("Scheduler");
  }

  start(mailer: Mailer, dataProvider: DataProvider): void {
    const weatherManager = new WeatherProviderManager(this.logger);
    const emailService = new EmailService(mailer, dataProvider, weatherManager, this.logger);

    // Hourly (at the beginning of each hour)
    cron.schedule("0 * * * *", async () => {
      await emailService.sendWeatherEmailsByFrequency("hourly");
      this.logger.info("Hourly weather emails sent.");
    });

    // Every day at 8:00 am
    cron.schedule("0 8 * * *", async () => {
      await emailService.sendWeatherEmailsByFrequency("daily");
      this.logger.info("Daily weather emails sent.");
    });
  }
}

export default Scheduler;
