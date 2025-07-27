import { EmailQueue } from "./emailQueue.js";
import { Mailer } from "../types.js";

const MAX_RETRIES = 3;

export function startEmailWorker(queue: EmailQueue, emailService: Mailer) {
  setInterval(async () => {
    while (!queue.isEmpty()) {
      const job = queue.dequeue();
      if (!job) return;
      try {
        if (job.type === "confirmation") {
          await emailService.sendConfirmationEmail(job.email, job.city, job.confirmUrl);
        } else if (job.type === "weather") {
          await emailService.sendWeatherEmail(job.email, job.weatherData, job.unsubscribeUrl);
        }
      } catch (err) {
        job.retries = (job.retries ?? 0) + 1;
        if (job.retries <= MAX_RETRIES) {
          console.warn(`Retrying job (attempt ${job.retries}):`, err);
          queue.enqueue(job);
        } else {
          console.error("Failed to send email after retries:", err);
        }
      }
    }
  }, 1000);
}