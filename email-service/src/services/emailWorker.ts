import { EmailQueue } from "./emailQueue.js";
import { Mailer } from "../types.js";
import { Logger } from "winston";
import { createLogger } from "../logger/index.js";
import { metrics } from "../metrics/index.js";

const MAX_RETRIES = 3;

export function startEmailWorker(queue: EmailQueue, emailService: Mailer) {
  const logger: Logger = createLogger("EmailWorker");

  logger.info("Starting email worker", { maxRetries: MAX_RETRIES });

  setInterval(async () => {
    const queueSize = queue.size();
    metrics.emailQueueSize.set(queueSize);

    if (queueSize > 0) {
      logger.debug("Processing email queue", { queueSize });
    }

    while (!queue.isEmpty()) {
      const job = queue.dequeue();
      if (!job) {
        return;
      }

      const jobId = `${job.type}-${Date.now()}`;
      logger.info("Processing email job", {
        jobId,
        type: job.type,
        email: job.email,
        retries: job.retries || 0,
      });

      try {
        if (job.type === "confirmation") {
          await emailService.sendConfirmationEmail(job.email, job.city, job.confirmUrl);
        } else if (job.type === "weather-update") {
          await emailService.sendWeatherEmail(job.email, job.weatherData, job.unsubscribeUrl);
        }

        logger.info("Email job completed successfully", {
          jobId,
          type: job.type,
          email: job.email,
        });
      } catch (err) {
        const currentRetries = (job.retries ?? 0) + 1;
        job.retries = currentRetries;

        // Record retry metrics
        metrics.emailRetries.inc({
          type: job.type,
          attempt: currentRetries.toString(),
        });

        if (currentRetries <= MAX_RETRIES) {
          logger.warn("Email job failed, retrying", {
            jobId,
            type: job.type,
            email: job.email,
            attempt: currentRetries,
            maxRetries: MAX_RETRIES,
            error: err instanceof Error ? err.message : String(err),
          });

          queue.enqueue(job);
        } else {
          logger.error("Email job failed after maximum retries", {
            jobId,
            type: job.type,
            email: job.email,
            finalAttempt: currentRetries,
            maxRetries: MAX_RETRIES,
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          });
        }
      }
    }
  }, 1000);
}
