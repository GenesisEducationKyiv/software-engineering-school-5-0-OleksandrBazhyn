import { RedisMessageBroker } from "../infra/RedisMessageBroker.js";
import { container } from "../di/container.js";
import { config } from "../config.js";
import { createLogger } from "../logger/index.js";

const logger = createLogger("EmailEventConsumer");

export async function handleEmailEvent(message: string) {
  const startTime = Date.now();
  let eventType = "unknown";

  try {
    const event = JSON.parse(message);
    eventType = event.type;

    logger.info("Processing email event", {
      eventType,
      email: event.email,
      city: event.city,
    });

    if (event.type === "subscription_confirmed") {
      const confirmUrl = event.confirmUrl;

      if (!event.email || !event.city || !confirmUrl) {
        throw new Error("Missing required fields for subscription_confirmed event");
      }

      logger.info("Enqueueing confirmation email", {
        email: event.email,
        city: event.city,
      });

      container.emailQueue.enqueue({
        type: "confirmation",
        email: event.email,
        city: event.city,
        confirmUrl,
      });
    } else if (event.type === "weather_update") {
      if (!event.email || !event.city || !event.unsubscribeUrl) {
        throw new Error("Missing required fields for weather_update event");
      }

      logger.info("Enqueueing weather email", {
        email: event.email,
        city: event.city,
        temperature: event.temperature,
        humidity: event.humidity,
        description: event.description,
      });

      container.emailQueue.enqueue({
        type: "weather-update",
        email: event.email,
        weatherData: {
          city: event.city,
          temperature: event.temperature || 0,
          humidity: event.humidity || 0,
          description: event.description || "No description available",
        },
        unsubscribeUrl: event.unsubscribeUrl,
      });
    } else {
      logger.warn("Unknown event type received", {
        eventType: event.type,
        event,
      });
      return;
    }

    const processingTime = Date.now() - startTime;
    logger.info("Email event processed successfully", {
      eventType,
      processingTime,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error("Failed to process email event", {
      eventType,
      processingTime,
      message,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function startEmailEventConsumer() {
  logger.info("Starting EmailEventConsumer", {
    redisUrl: config.REDIS_URL ? "configured" : "not configured",
  });

  try {
    const broker = new RedisMessageBroker(config.REDIS_URL, createLogger("RedisMessageBroker"));
    await broker.connect();

    logger.info("Connected to Redis message broker");

    await broker.subscribe("subscription_confirmed", handleEmailEvent);
    await broker.subscribe("weather_update", handleEmailEvent);

    logger.info("EmailEventConsumer started successfully", {
      subscribedChannels: ["subscription_confirmed", "weather_update"],
    });
  } catch (error) {
    logger.error("Failed to start EmailEventConsumer", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
