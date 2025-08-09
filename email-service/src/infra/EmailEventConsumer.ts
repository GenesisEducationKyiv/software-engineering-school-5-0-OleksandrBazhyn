import { RedisMessageBroker } from "../infra/RedisMessageBroker.js";
import { container } from "../di/container.js";
import { config } from "../config.js";
import { createLogger } from "../logger/index.js";

const logger = createLogger("EmailEventConsumer");

export async function handleEmailEvent(message: string) {
  const event = JSON.parse(message);

  if (event.type === "subscription_confirmed") {
    const confirmUrl = event.confirmUrl;
    logger.info(`Received subscription_confirmed for ${event.email} (${event.city})`);
    container.emailQueue.enqueue({
      type: "confirmation",
      email: event.email,
      city: event.city,
      confirmUrl,
    });
  }

  if (event.type === "weather_update") {
    logger.info(`Received weather_update for ${event.email} (${event.city})`);
    container.emailQueue.enqueue({
      type: "weather-update",
      email: event.email,
      weatherData: {
        city: event.city,
        temperature: event.temperature,
        humidity: event.humidity,
        description: event.description,
      },
      unsubscribeUrl: event.unsubscribeUrl,
    });
  }
}

export async function startEmailEventConsumer() {
  const broker = new RedisMessageBroker(config.REDIS_URL, createLogger("RedisMessageBroker"));
  await broker.connect();
  await broker.subscribe("subscription_confirmed", handleEmailEvent);
  await broker.subscribe("weather_update", handleEmailEvent);
  logger.info("EmailEventConsumer started and listening for events...");
}
