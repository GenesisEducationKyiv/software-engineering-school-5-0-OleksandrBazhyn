import { WeatherData, WeatherCacheServiceInterface } from "../../types.js";
import { RedisClient } from "./RedisClient.js";
import { Logger } from "winston";

export class WeatherCacheService implements WeatherCacheServiceInterface {
  private redisClient: RedisClient;
  private logger: Logger;
  private defaultTTL = 300; // 5 minutes

  constructor(redisClient: RedisClient, logger: Logger) {
    this.redisClient = redisClient;
    this.logger = logger;
  }

  private getCacheKey(city: string): string {
    return `weather:${city.toLowerCase()}`;
  }

  async get(city: string): Promise<WeatherData | null> {
    const key = this.getCacheKey(city);

    try {
      this.logger.debug(`Attempting to get weather data for ${city} from cache`);

      const cachedData = await this.redisClient.get(key);

      if (cachedData) {
        this.logger.info(`Cache hit for weather data: ${city}`);

        try {
          return JSON.parse(cachedData) as WeatherData;
        } catch (parseError) {
          this.logger.error(`Error parsing cached data for ${city}:`, parseError);
          await this.redisClient.del(key);
          return null;
        }
      } else {
        this.logger.debug(`Cache miss for weather data: ${city}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error getting weather data from cache for ${city}:`, error);
      return null;
    }
  }

  async set(city: string, weatherData: WeatherData, ttl?: number): Promise<void> {
    const key = this.getCacheKey(city);

    try {
      this.logger.debug(`Caching weather data for ${city}`);

      const serializedData = JSON.stringify(weatherData);
      await this.redisClient.set(key, serializedData, ttl || this.defaultTTL);

      this.logger.info(`Weather data cached for ${city} (TTL: ${ttl || this.defaultTTL}s)`);
    } catch (error) {
      this.logger.error(`Error caching weather data for ${city}:`, error);
      throw error;
    }
  }

  async invalidate(city: string): Promise<void> {
    const key = this.getCacheKey(city);

    try {
      this.logger.debug(`Invalidating cache for ${city}`);

      await this.redisClient.del(key);

      this.logger.info(`Cache invalidated for ${city}`);
    } catch (error) {
      this.logger.error(`Error invalidating cache for ${city}:`, error);
      throw error;
    }
  }

  async exists(city: string): Promise<boolean> {
    const key = this.getCacheKey(city);

    try {
      return await this.redisClient.exists(key);
    } catch (error) {
      this.logger.error(`Error checking cache existence for ${city}:`, error);
      return false;
    }
  }

  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
    this.logger.info(`Default cache TTL set to ${ttl} seconds`);
  }

  getDefaultTTL(): number {
    return this.defaultTTL;
  }
}

export default WeatherCacheService;
