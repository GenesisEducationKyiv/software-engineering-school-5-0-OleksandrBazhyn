import { createClient, RedisClientType } from "redis";
import { Logger } from "winston";

export class RedisMessageBroker {
  private subscriber: RedisClientType;
  private logger: Logger;

  constructor(redisUrl: string, logger: Logger) {
    this.subscriber = createClient({ url: redisUrl });
    this.logger = logger;
  }

  async connect(): Promise<void> {
    await this.subscriber.connect();
    this.logger.info("Connected to Redis as subscriber");
  }

  async subscribe(topic: string, handler: (message: string) => Promise<void>): Promise<void> {
    await this.subscriber.subscribe(topic, async (message) => {
      this.logger.info(`Received message on topic "${topic}"`);
      await handler(message);
    });
    this.logger.info(`Subscribed to topic "${topic}"`);
  }
}
