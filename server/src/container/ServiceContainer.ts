import { WeatherProviderManager } from "../services/weather/WeatherProviderManager.js";
import SubscriptionService from "../services/subscription/SubscriptionService.js";
import MailManager from "../services/email/MailManager.js";
import SubscriptionDataProvider from "../services/subscription/SubscriptionDataProvider.js";
import { RedisClient } from "../services/cache/RedisClient.js";
import { AppServicesInterface } from "../types.js";
import { config } from "../config.js";
import { createLogger } from "../logger/index.js";
import nodemailer from "nodemailer";

export async function createServices(): Promise<AppServicesInterface> {
  const logger = createLogger("ServiceContainer");

  let redisClient: RedisClient | null = null;
  if (config.REDIS_ENABLED) {
    try {
      redisClient = new RedisClient(createLogger("RedisClient"));
      await redisClient.connect();
      logger.info("Redis client initialized successfully");
    } catch (error) {
      logger.warn("Redis initialization failed, running without cache:", error);
      redisClient = null;
    }
  }

  const weatherManager = new WeatherProviderManager(
    createLogger("WeatherProviderManager"),
    redisClient || undefined,
  );

  const subscriptionService = new SubscriptionService(
    new MailManager(
      nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
      }),
      createLogger("MailManager"),
    ),
    SubscriptionDataProvider,
    createLogger("SubscriptionService"),
  );

  return {
    weatherManager,
    subscriptionService,
    redisClient,
  };
}

export default createServices;
