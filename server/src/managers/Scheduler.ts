import cron from "node-cron";
import EmailService from "./EmailService.js";
import GmailMailer from "./GmailMailer.js";

class Scheduler {
  start() {
    const emailService = new EmailService(new GmailMailer());

    // Hourly (at the beginning of each hour)
    cron.schedule("0 * * * *", async () => {
      await emailService.sendWeatherEmailsByFrequency("hourly");
      console.log("Hourly weather emails sent.");
    });

    // Every day at 8:00 am
    cron.schedule("0 8 * * *", async () => {
      await emailService.sendWeatherEmailsByFrequency("daily");
      console.log("Daily weather emails sent.");
    });
  }
}

export default new Scheduler();
