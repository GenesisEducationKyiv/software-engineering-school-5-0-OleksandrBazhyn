import { createClient, RedisClientType } from "redis";
import { MessageBroker } from "../types.js";

export class RedisMessageBroker implements MessageBroker {
  private publisher: RedisClientType;
  private subscriber: RedisClientType;

  constructor(redisUrl: string) {
    this.publisher = createClient({ url: redisUrl });
    this.subscriber = createClient({ url: redisUrl });
  }

  async connect(): Promise<void> {
    await this.publisher.connect();
    await this.subscriber.connect();
  }

  async publish(topic: string, message: string): Promise<void> {
    await this.publisher.publish(topic, message);
  }

  async subscribe(topic: string, handler: (message: string) => Promise<void>): Promise<void> {
    await this.subscriber.subscribe(topic, async (message) => {
      await handler(message);
    });
  }
}
