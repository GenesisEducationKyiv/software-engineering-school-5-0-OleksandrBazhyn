import { WeatherData, WeatherCacheServiceInterface } from "../../types.js";
import { RedisClient } from "./RedisClient.js";
import { Logger } from "winston";
import { cacheOperationsTotal, cacheResponseTime, errorRate } from "../../metrics/index.js";

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
    const startTime = Date.now();

    try {
      this.logger.debug("Attempting to get weather data from cache", {
        city,
        key,
      });

      const cachedData = await this.redisClient.get(key);
      const duration = (Date.now() - startTime) / 1000;

      if (cachedData) {
        cacheOperationsTotal.inc({ operation: "hit", status: "success" });
        cacheResponseTime.observe({ operation: "get" }, duration);

        this.logger.info("Cache hit for weather data", {
          city,
          duration: duration * 1000,
        });

        try {
          return JSON.parse(cachedData) as WeatherData;
        } catch (parseError) {
          cacheOperationsTotal.inc({ operation: "hit", status: "parse_error" });
          errorRate.inc({ type: "cache", service: "parse" });

          this.logger.error("Error parsing cached data", {
            city,
            error: parseError instanceof Error ? parseError.message : String(parseError),
          });

          await this.redisClient.del(key);
          return null;
        }
      }

      cacheOperationsTotal.inc({ operation: "miss", status: "success" });
      cacheResponseTime.observe({ operation: "get" }, duration);

      this.logger.debug("Cache miss for weather data", {
        city,
        duration: duration * 1000,
      });

      return null;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      cacheOperationsTotal.inc({ operation: "miss", status: "error" });
      cacheResponseTime.observe({ operation: "get" }, duration);
      errorRate.inc({ type: "cache", service: "get" });

      this.logger.error("Error getting weather data from cache", {
        city,
        duration: duration * 1000,
        error: error instanceof Error ? error.message : String(error),
      });

      return null;
    }
  }

  async set(city: string, weatherData: WeatherData, ttl?: number): Promise<void> {
    const key = this.getCacheKey(city);
    const startTime = Date.now();

    try {
      this.logger.debug("Caching weather data", {
        city,
        ttl: ttl || this.defaultTTL,
      });

      const serializedData = JSON.stringify(weatherData);
      await this.redisClient.set(key, serializedData, ttl || this.defaultTTL);

      const duration = (Date.now() - startTime) / 1000;
      cacheOperationsTotal.inc({ operation: "set", status: "success" });
      cacheResponseTime.observe({ operation: "set" }, duration);

      this.logger.info("Weather data cached successfully", {
        city,
        ttl: ttl || this.defaultTTL,
        duration: duration * 1000,
      });
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      cacheOperationsTotal.inc({ operation: "set", status: "error" });
      cacheResponseTime.observe({ operation: "set" }, duration);
      errorRate.inc({ type: "cache", service: "set" });

      this.logger.error("Error caching weather data", {
        city,
        duration: duration * 1000,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  async invalidate(city: string): Promise<void> {
    const key = this.getCacheKey(city);
    const startTime = Date.now();

    try {
      this.logger.debug("Invalidating cache", { city });

      await this.redisClient.del(key);

      const duration = (Date.now() - startTime) / 1000;
      cacheOperationsTotal.inc({ operation: "invalidate", status: "success" });
      cacheResponseTime.observe({ operation: "invalidate" }, duration);

      this.logger.info("Cache invalidated successfully", {
        city,
        duration: duration * 1000,
      });
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      cacheOperationsTotal.inc({ operation: "invalidate", status: "error" });
      cacheResponseTime.observe({ operation: "invalidate" }, duration);
      errorRate.inc({ type: "cache", service: "invalidate" });

      this.logger.error("Error invalidating cache", {
        city,
        duration: duration * 1000,
        error: error instanceof Error ? error.message : String(error),
      });

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
