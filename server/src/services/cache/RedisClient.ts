import { createClient, RedisClientType } from "redis";
import { Logger } from "winston";
import { config } from "../../config.js";
import { RedisClientInterface } from "../../types.js";

export class RedisClient implements RedisClientInterface {
  private client: RedisClientType;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.client = createClient({
      url: config.REDIS_URL,
    });

    this.client.on("error", (err) => {
      this.logger.error("Redis Client Error:", err);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.info("Redis connection established");
    } catch (error) {
      this.logger.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.logger.info("Redis connection closed");
    } catch (error) {
      this.logger.error("Error disconnecting from Redis:", error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key} from Redis:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key} in Redis:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key} from Redis:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(
        `Error checking existence of key ${key} in Redis:`,
        error,
      );
      return false;
    }
  }

  isConnected(): boolean {
    return this.client.isOpen;
  }
}

export default RedisClient;
